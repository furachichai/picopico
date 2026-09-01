/**
 * scriptParser.js
 * 
 * Pure function that parses a markdown-like lesson script into structured slide data.
 * No React, no side effects — fully testable.
 * 
 * Script Format:
 *   # Microlesson: Title            ← optional, sets lesson title
 *   ## SLIDE                        ← narrative slide
 *   ## SLIDE (Quiz)                 ← quiz slide
 *   ## SLIDE (Collectible Card)     ← collectible card slide
 * 
 * Dialogues:     **CharName:** text
 * Image hints:   **(Image)** description
 * Quiz options:  1. Option text      ← first option
 *                2. Option text *    ← correct answer (marked with *)
 * Correct mark:  trailing * on the option line
 */

/**
 * @typedef {Object} ParsedDialogue
 * @property {string} character
 * @property {string} text
 */

/**
 * @typedef {Object} ParsedSlide
 * @property {'narrative'|'quiz'|'collectible'} type
 * @property {number} slideNumber - 1-indexed position
 * @property {string|null} imagePrompt
 * @property {ParsedDialogue[]} dialogues
 * @property {string|null} questionText
 * @property {string[]} options
 * @property {number[]} correctIndices
 * @property {string|null} bodyText
 * @property {string[]} warnings - non-fatal issues found during parsing
 */

/**
 * @typedef {Object} ParseResult
 * @property {string|null} title
 * @property {ParsedSlide[]} slides
 * @property {string[]} errors - fatal errors that prevent building
 * @property {string[]} warnings - non-fatal issues
 */

/**
 * Parse a lesson script into structured data.
 * @param {string} text - The raw markdown script
 * @returns {ParseResult}
 */
export function parseScript(text) {
    const result = {
        title: null,
        slides: [],
        errors: [],
        warnings: [],
    };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        result.errors.push('Script is empty.');
        return result;
    }

    // Extract title from # Microlesson: ... line
    const titleMatch = text.match(/^#\s+(?:Microlesson:\s*)?(.+)$/m);
    if (titleMatch) {
        result.title = titleMatch[1].trim();
    }

    // Split into slide blocks on ## SLIDE headers
    // We capture the header line itself to determine slide type
    const slideHeaderRegex = /^##\s+SLIDE\b/im;

    if (!slideHeaderRegex.test(text)) {
        result.errors.push('No slides found. Each slide must start with "## SLIDE".');
        return result;
    }

    // Split by ## SLIDE, keeping the delimiter
    const parts = text.split(/(?=^##\s+SLIDE\b)/im);

    let slideNumber = 0;

    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        // Skip preamble (anything before the first ## SLIDE)
        if (!slideHeaderRegex.test(trimmed)) continue;

        slideNumber++;
        const slide = parseSingleSlide(trimmed, slideNumber);
        result.slides.push(slide);

        // Bubble up warnings
        if (slide.warnings.length > 0) {
            result.warnings.push(...slide.warnings.map(w => `Slide ${slideNumber}: ${w}`));
        }
    }

    if (result.slides.length === 0) {
        result.errors.push('No valid slides could be parsed from the script.');
    }

    return result;
}


/**
 * Parse a single slide block.
 * @param {string} block - The raw text for one slide, starting with ## SLIDE
 * @param {number} slideNumber
 * @returns {ParsedSlide}
 */
function parseSingleSlide(block, slideNumber) {
    const slide = {
        type: 'narrative',
        slideNumber,
        imagePrompt: null,
        dialogues: [],
        questionText: null,
        options: [],
        correctIndices: [],
        bodyText: null,
        warnings: [],
    };

    const lines = block.split('\n');
    const headerLine = lines[0].trim();

    // Determine slide type from header
    const typeMatch = headerLine.match(/##\s+SLIDE\s*\(([^)]+)\)/i);
    if (typeMatch) {
        const typeStr = typeMatch[1].trim().toLowerCase();
        if (typeStr === 'quiz') {
            slide.type = 'quiz';
        } else if (typeStr === 'collectible card' || typeStr === 'collectible') {
            slide.type = 'collectible';
        } else {
            slide.warnings.push(`Unknown slide type "(${typeMatch[1].trim()})". Treated as narrative.`);
        }
    }

    // Process body lines (everything after the header)
    const bodyLines = lines.slice(1);
    const imageLines = [];
    const dialogueLines = [];
    const optionLines = [];
    const textLines = [];

    for (const rawLine of bodyLines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line === '---') continue;

        // Image prompt: **(Image)** description
        const imageMatch = line.match(/^\*\*\(Image\)\*\*\s*(.*)/i);
        if (imageMatch) {
            imageLines.push(imageMatch[1].trim());
            continue;
        }

        // Dialogue: **CharName:** text  (colon inside the bold markers)
        const dialogueMatch = line.match(/^\*\*([^*]+?):\*\*\s*(.*)/);
        if (dialogueMatch) {
            dialogueLines.push({
                character: dialogueMatch[1].trim(),
                text: dialogueMatch[2].trim(),
            });
            continue;
        }

        // Numbered option: 1. Option text  *
        const optionMatch = line.match(/^(\d+)\.\s+(.+)/);
        if (optionMatch) {
            optionLines.push({
                number: parseInt(optionMatch[1], 10),
                text: optionMatch[2].trim(),
            });
            continue;
        }

        // Everything else is general text
        textLines.push(line);
    }

    // Assemble the slide data based on type
    if (slide.type === 'quiz') {
        parseQuizSlide(slide, optionLines, textLines, dialogueLines);
    } else if (slide.type === 'collectible') {
        parseCollectibleSlide(slide, textLines, dialogueLines);
    } else {
        parseNarrativeSlide(slide, textLines, dialogueLines);
    }

    // Set image prompt
    if (imageLines.length > 0) {
        slide.imagePrompt = imageLines.join(' ');
    }

    return slide;
}


/**
 * Parse quiz-specific content.
 */
function parseQuizSlide(slide, optionLines, textLines, dialogueLines) {
    // Options
    if (optionLines.length === 0) {
        slide.warnings.push('Quiz slide has no options. Expected numbered list (1. 2. 3.).');
    }

    const options = [];
    const correctIndices = [];

    for (let i = 0; i < optionLines.length; i++) {
        let optText = optionLines[i].text;

        // Check for correct answer marker: trailing * or ✓
        const isCorrect = /[*✓✔]\s*$/.test(optText);
        if (isCorrect) {
            optText = optText.replace(/\s*[*✓✔]\s*$/, '').trim();
            correctIndices.push(i);
        }

        options.push(optText);
    }

    // Default to first option if none marked
    if (options.length > 0 && correctIndices.length === 0) {
        correctIndices.push(0);
        slide.warnings.push('No correct answer marked with *. Defaulting to option 1.');
    }

    slide.options = options;
    slide.correctIndices = correctIndices;

    // Question text = any remaining text lines (before the options)
    // Also include any dialogue-style lines as part of the question
    const questionParts = [];
    if (textLines.length > 0) {
        questionParts.push(...textLines);
    }
    // Dialogues on quiz slides are unusual but could happen
    if (dialogueLines.length > 0) {
        questionParts.push(...dialogueLines.map(d => `${d.character}: ${d.text}`));
    }

    slide.questionText = questionParts.length > 0 ? questionParts.join('\n') : null;

    if (!slide.questionText && options.length > 0) {
        slide.warnings.push('Quiz has options but no question text.');
    }
}


/**
 * Parse collectible card content.
 */
function parseCollectibleSlide(slide, textLines, dialogueLines) {
    const allText = [];

    if (textLines.length > 0) {
        allText.push(...textLines);
    }
    if (dialogueLines.length > 0) {
        allText.push(...dialogueLines.map(d => `**${d.character}:** ${d.text}`));
    }

    slide.bodyText = allText.length > 0 ? allText.join('\n') : null;

    if (!slide.bodyText) {
        slide.warnings.push('Collectible card slide has no content.');
    }
}


/**
 * Parse narrative slide content.
 */
function parseNarrativeSlide(slide, textLines, dialogueLines) {
    // Dialogues become balloon elements
    slide.dialogues = dialogueLines;

    // Remaining text becomes body text (for narrator lines, descriptions, etc.)
    if (textLines.length > 0) {
        slide.bodyText = textLines.join('\n');
    }
}


/**
 * Convert parsed script data into lesson slide objects ready for EditorContext.
 * This maps the abstract ParsedSlide format → the concrete lesson.json format.
 * 
 * @param {ParsedSlide[]} parsedSlides
 * @param {Object} [textPreset] - The lesson's textPreset for font styling
 * @returns {Object[]} - Array of slide objects for lesson.json
 */
export function buildLessonSlides(parsedSlides, textPreset = null) {
    const now = Date.now();

    return parsedSlides.map((parsed, index) => {
        const slideId = `slide-${now + index}`;
        const elements = [];

        let elCounter = 0;
        const nextElId = () => `el-${now + index * 100 + (++elCounter)}`;

        if (parsed.type === 'quiz') {
            buildQuizElements(parsed, elements, nextElId, textPreset);
        } else if (parsed.type === 'collectible') {
            buildCollectibleElements(parsed, elements, nextElId, textPreset);
        } else {
            buildNarrativeElements(parsed, elements, nextElId, textPreset);
        }

        return {
            id: slideId,
            background: parsed.type === 'collectible' ? '#1a1a2e' : '#E1F5FE',
            elements,
            order: index,
        };
    });
}


/**
 * Build elements for a quiz slide.
 */
function buildQuizElements(parsed, elements, nextElId, textPreset) {
    // Question text at the top
    if (parsed.questionText) {
        elements.push({
            id: nextElId(),
            type: 'text',
            content: parsed.questionText,
            x: 50,
            y: 22,
            width: 86,
            height: 14,
            rotation: 0,
            scale: 1,
            metadata: {
                textAlign: 'center',
                fontFamily: textPreset?.text?.fontFamily || '"Fira Sans"',
                fontSize: textPreset?.text?.fontSize || 20,
                lineHeight: 1.35,
                fontWeight: '600',
                ...(textPreset?.text?.color && { color: textPreset.text.color }),
            },
        });
    }

    // Quiz element in the bottom area
    elements.push({
        id: nextElId(),
        type: 'quiz',
        content: 'Quiz',
        x: 50,
        y: 75,
        width: 20,
        height: 10,
        rotation: 0,
        scale: 1,
        metadata: {
            fontFamily: textPreset?.quizAnswers?.fontFamily || '"Fira Sans"',
            options: parsed.options.length > 0 ? parsed.options : ['Option 1', 'Option 2', 'Option 3'],
            correctIndex: parsed.correctIndices[0] ?? 0,
            correctIndices: parsed.correctIndices.length > 0 ? parsed.correctIndices : [0],
            quizType: 'classic',
            visualMode: false,
            ...(textPreset?.quizAnswers?.fontSize && { answerFontSize: textPreset.quizAnswers.fontSize }),
            ...(textPreset?.quizAnswers?.color && { answerColor: textPreset.quizAnswers.color }),
        },
    });
}


/**
 * Build elements for a collectible card slide.
 */
function buildCollectibleElements(parsed, elements, nextElId, textPreset) {
    if (parsed.bodyText) {
        // Convert markdown bold **text** to HTML <b>text</b>
        const htmlContent = parsed.bodyText.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

        elements.push({
            id: nextElId(),
            type: 'collectible',
            content: htmlContent,
            x: 50,
            y: 50,
            width: 82,
            height: 60,
            rotation: 0,
            scale: 1,
            metadata: {
                fontFamily: textPreset?.text?.fontFamily || '"Outfit", sans-serif',
                fontSize: 18,
                color: '#ffffff',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                lineHeight: 1.4,
            },
        });
    }
}


/**
 * Build elements for a narrative slide.
 */
function buildNarrativeElements(parsed, elements, nextElId, textPreset) {
    // Stacking positions for balloons
    const balloonPositions = [
        { x: 50, y: 25 },
        { x: 50, y: 52 },
        { x: 50, y: 78 },
    ];

    // If we have dialogues, create balloon elements
    for (let i = 0; i < parsed.dialogues.length; i++) {
        const d = parsed.dialogues[i];
        const pos = balloonPositions[Math.min(i, balloonPositions.length - 1)];

        // Offset if more than 3 balloons (stack them closer)
        const yPos = parsed.dialogues.length > 3
            ? 15 + (i * (70 / parsed.dialogues.length))
            : pos.y;

        elements.push({
            id: nextElId(),
            type: 'balloon',
            content: `<b>${d.character}:</b> ${d.text}`,
            x: pos.x,
            y: yPos,
            width: 65,
            height: 15,
            rotation: 0,
            scale: 1,
            metadata: {
                backgroundColor: '#ffffff',
                color: '#000000',
                fontFamily: textPreset?.balloon?.fontFamily || '"Fira Sans"',
                fontSize: textPreset?.balloon?.fontSize || 16,
                tailPos: { x: i % 2 === 0 ? 15 : 85, y: 83 },
            },
        });
    }

    // If there's body text and no dialogues, add as a regular text element
    if (parsed.bodyText && parsed.dialogues.length === 0) {
        elements.push({
            id: nextElId(),
            type: 'text',
            content: parsed.bodyText,
            x: 50,
            y: 50,
            width: 70,
            height: 20,
            rotation: 0,
            scale: 1,
            metadata: {
                textAlign: 'center',
                fontFamily: textPreset?.text?.fontFamily || '"Fira Sans"',
                ...(textPreset?.text?.color && { color: textPreset.text.color }),
            },
        });
    }

    // If there's body text AND dialogues, add as a smaller text element at top
    if (parsed.bodyText && parsed.dialogues.length > 0) {
        elements.push({
            id: nextElId(),
            type: 'text',
            content: parsed.bodyText,
            x: 50,
            y: 10,
            width: 80,
            height: 10,
            rotation: 0,
            scale: 1,
            metadata: {
                textAlign: 'center',
                fontFamily: textPreset?.text?.fontFamily || '"Fira Sans"',
                fontSize: 14,
                ...(textPreset?.text?.color && { color: textPreset.text.color }),
            },
        });
    }
}
