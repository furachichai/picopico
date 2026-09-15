import React, { useState, useEffect, useRef } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useLanguage, getTranslatedContent } from '../../context/LanguageContext';
import SlideThumbnail from '../Editor/SlideThumbnail';
import Banner from '../Editor/Banner';
import Balloon from '../Editor/Balloon';
import ResultField from '../ResultField/ResultField';
import NumberLine from '../NumberLine/NumberLine';
import CharacterShadow from '../Editor/CharacterShadow';
import ErrorBoundary from '../ErrorBoundary';
import SwipeSorter from '../../cartridges/SwipeSorter/SwipeSorter';
import ExloreNLCartridge from '../../cartridges/ExploreNL/ExloreNLCartridge';
import BalanzaCartridge from '../../cartridges/Balanza/BalanzaCartridge';
import PEMDASCartridge from '../../cartridges/PEMDAS/PEMDASCartridge';
import AlgeBrosCartridge from '../../cartridges/AlgeBros/AlgeBrosCartridge';
import Potiondas from '../../cartridges/Potiondas/Potiondas';
import FractionAlpha from '../../cartridges/FractionAlpha/FractionAlpha';
import FractionSlicer from '../../cartridges/FractionSlicer/FractionSlicer';
import QuizPlayer from '../Player/QuizPlayer';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { formatExponents } from '../../utils/textFormatters';
import './CardsView.css';

/**
 * Clean numeric prefix from concept name, e.g.:
 * "01-Pociones" -> "Pociones"
 * "7323-Why Anything to the Power of 0 Equals 1" -> "Why Anything to the Power of 0 Equals 1"
 */
const getConceptName = (lesson, language = 'es') => {
  const rawConcept = lesson.concept || lesson.content?.concept;
  if (rawConcept) return rawConcept;

  const translated = language !== 'es' && lesson.content?.translations?.[language]?.title;
  let title = translated || lesson.title || lesson.name || 'Card';
  title = title.replace(/^\d+[\s-_.]*(\d+[\s-_.]*)?/, '').trim();
  return title || lesson.title || lesson.name;
};

const CardsView = () => {
  const { dispatch } = useEditor();
  const { language } = useLanguage();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  // Fullscreen scale estimation for the 360x640 stage
  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.innerWidth / 360, window.innerHeight / 640);
  });

  useEffect(() => {
    const handleResize = () => {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const w = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const newScale = Math.min(w / 360, h / 640);
      setScale(newScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Fetch lessons and extract collectible cards (the last slide of each lesson)
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const isDev = import.meta.env.DEV;
        let data;
        if (isDev) {
          const response = await fetch('/api/list-lessons');
          data = await response.json();
        } else {
          const response = await fetch('/lessons-data.json');
          data = await response.json();
        }

        const validCards = [];

        data.forEach(item => {
          if (item.visible === false || item.content?.visible === false) return;

          const slides = item.content?.slides || item.slides || [];
          if (!slides || slides.length === 0) return;

          // The collectible card is the last slide of the lesson
          const cardSlide = slides[slides.length - 1];
          if (!cardSlide) return;

          // Skip completely empty placeholder slides
          const hasElements = cardSlide.elements && cardSlide.elements.length > 0;
          const hasCartridge = !!cardSlide.cartridge;
          if (!hasElements && !hasCartridge && !cardSlide.background) return;

          const concept = getConceptName(item, language);

          validCards.push({
            id: item.path || item.id || item.name,
            concept,
            slide: cardSlide,
            lesson: item
          });
        });

        setCards(validCards);
      } catch (err) {
        console.error('Error fetching cards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [language]);

  // Render an isolated collectible card slide (full modal or scaled thumbnail preview)
  const renderFullCardSlide = (slide, isThumbnail = false) => {
    if (!slide) return null;

    const mappedBackground = slide.background ? resolveAssetUrl(slide.background) : slide.background;
    const isUrlOrGradient = mappedBackground && (mappedBackground.includes('url') || mappedBackground.includes('gradient'));
    const bgSettings = slide.backgroundSettings;

    return (
      <div
        style={{
          width: '360px',
          height: '640px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: (mappedBackground && !isUrlOrGradient) ? mappedBackground : '#ffffff',
          userSelect: 'none',
        }}
      >
        {/* Inside-Slide Top-Left Navigation Controls (Full modal only) */}
        {!isThumbnail && (
          <div className="card-slide-top-btns">
            <button
              className="player-top-btn"
              onClick={() => setSelectedCard(null)}
              title="Back to cards"
              aria-label="Back to cards"
            >
              <ArrowLeft size={22} strokeWidth={2.8} />
            </button>
            <button
              className="player-top-btn"
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
              title="Main menu"
              aria-label="Main menu"
            >
              <Home size={22} strokeWidth={2.8} />
            </button>
          </div>
        )}

        {/* Background Image / Gradient */}
        {isUrlOrGradient && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: mappedBackground,
              backgroundSize: bgSettings?.sizeMode === 'custom'
                ? `${bgSettings?.size ?? 100}%`
                : (bgSettings?.sizeMode || 'cover'),
              backgroundPosition: `${bgSettings?.positionX ?? 50}% ${bgSettings?.positionY ?? 50}%`,
              backgroundRepeat: 'no-repeat',
              opacity: bgSettings?.opacity ?? 1,
              filter: bgSettings
                ? `grayscale(${bgSettings.grayscale ? 100 : 0}%) brightness(${bgSettings.brightness ?? 100}%) blur(${bgSettings.blur ?? 0}px)`
                : undefined,
              transform: bgSettings
                ? `scale(${(bgSettings.flipX ? -1 : 1) * ((bgSettings.blur ?? 0) > 0 ? 1.05 : 1)}, ${(bgSettings.flipY ? -1 : 1) * ((bgSettings.blur ?? 0) > 0 ? 1.05 : 1)})`
                : undefined,
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        )}
        {bgSettings?.grayscale && bgSettings?.tintColor && bgSettings.tintColor !== 'transparent' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: bgSettings.tintColor,
              mixBlendMode: 'color',
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Cartridge Layer: Positioned above background & banner panels (zIndex 30) so ExploreNL and its equation work smoothly */}
        {slide.cartridge && (
          <div
            className="cartridge-container"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 30,
              pointerEvents: 'auto'
            }}
          >
            {(slide.cartridge.type === 'ExploreNL' || slide.cartridge.type === 'ExloreNL') && (
              <ErrorBoundary>
                <ExloreNLCartridge
                  config={slide.cartridge.config}
                  preview={false}
                  readOnly={isThumbnail}
                  onComplete={() => {}}
                />
              </ErrorBoundary>
            )}
            {slide.cartridge.type === 'Balanza' && (
              <ErrorBoundary>
                <BalanzaCartridge
                  config={slide.cartridge.config}
                  onComplete={() => {}}
                />
              </ErrorBoundary>
            )}
            {slide.cartridge.type === 'SwipeSorter' && (
              <SwipeSorter config={slide.cartridge.config} preview={true} />
            )}
            {slide.cartridge.type === 'PEMDAS' && (
              <ErrorBoundary>
                <PEMDASCartridge
                  config={slide.cartridge.config}
                  onComplete={() => {}}
                />
              </ErrorBoundary>
            )}
            {slide.cartridge.type === 'AlgeBros' && (
              <ErrorBoundary>
                <AlgeBrosCartridge
                  config={slide.cartridge.config}
                  onComplete={() => {}}
                />
              </ErrorBoundary>
            )}
            {slide.cartridge.type === 'Potiondas' && (
              <ErrorBoundary>
                <Potiondas
                  config={slide.cartridge.config}
                  isAlreadySolved={true}
                  onComplete={() => {}}
                />
              </ErrorBoundary>
            )}
            {slide.cartridge.type === 'FractionAlpha' && (
              <FractionAlpha config={slide.cartridge.config} onComplete={() => {}} />
            )}
            {slide.cartridge.type === 'FractionSlicer' && (
              <FractionSlicer config={slide.cartridge.config} onComplete={() => {}} />
            )}
          </div>
        )}

        {/* Slide Elements Layer */}
        {slide.elements && slide.elements.map((element, idx) => {
          if (element.metadata?.hidden) return null;

          const isFullScreenQuiz = element.type === 'quiz' && (
            element.metadata?.quizType === 'chatquiz' ||
            element.metadata?.quizType === 'pem' ||
            element.metadata?.quizType === 'match' ||
            element.metadata?.quizType === 'conecta'
          );
          const isMatchQuiz = element.type === 'quiz' && (
            element.metadata?.quizType === 'match' ||
            element.metadata?.quizType === 'conecta'
          );
          const isTypeQuiz = element.type === 'quiz' && element.metadata?.quizType === 'type';

          const effectiveScale = element.scale ?? 1;
          const effectiveWidth = element.width;
          const effectiveY = element.y;

          // Layering: banners are background panels (zIndex 2..10).
          // Cartridge is at zIndex 30.
          // Text, lines, and quizzes sit at zIndex 50+ (above cartridge and banners).
          const isBanner = element.type === 'banner';
          const elementZIndex = isBanner
            ? (idx + 2)
            : (element.type === 'result_field' ? (idx + 1000) : (element.type === 'quiz' ? (idx + 100) : (idx + 50)));

          return (
            <div
              key={element.id || idx}
              style={{
                position: 'absolute',
                left: isTypeQuiz ? '0' : (isFullScreenQuiz ? '50%' : `${element.x}%`),
                top: isTypeQuiz ? 'auto' : (isMatchQuiz ? '50%' : (isFullScreenQuiz ? '55%' : `${(element.type === 'quiz' && effectiveY === 75) ? 78.59375 : effectiveY}%`)),
                bottom: isTypeQuiz ? '0' : undefined,
                width: (isFullScreenQuiz || isTypeQuiz) ? '100%' : (element.type === 'quiz' || element.type === 'result_field' ? 'auto' : ((element.type === 'text' || element.type === 'collectible') && !effectiveWidth ? 'auto' : `${effectiveWidth}%`)),
                height: isTypeQuiz ? '30%' : (isMatchQuiz ? '100%' : (isFullScreenQuiz ? '85%' : (element.type === 'text' || element.type === 'collectible' || element.type === 'quiz' || element.type === 'result_field' ? 'auto' : `${element.height}%`))),
                transform: isTypeQuiz ? 'none' : (isFullScreenQuiz ? 'translate(-50%, -50%)' : `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${effectiveScale * (element.metadata?.flipX ? -1 : 1)}, ${effectiveScale * (element.metadata?.flipY ? -1 : 1)})`),
                zIndex: elementZIndex,
                pointerEvents: (element.type === 'result_field') ? 'auto' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...((element.type !== 'image' && element.type !== 'popup') ? {
                  opacity: element.metadata?.opacity ?? element.opacity ?? 1
                } : {})
              }}
            >
              {(element.type === 'text' || element.type === 'collectible') && (
                <div
                  style={{
                    fontFamily: element.metadata?.fontFamily || (element.type === 'collectible' ? '"Outfit", sans-serif' : '"HVD Comic Serif Pro", sans-serif'),
                    fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : (element.type === 'collectible' ? '18px' : '16px'),
                    fontWeight: element.metadata?.fontWeight || (element.type === 'collectible' ? '500' : 'normal'),
                    fontStyle: element.metadata?.fontStyle || 'normal',
                    textDecoration: element.metadata?.textDecoration || 'none',
                    color: element.metadata?.color || (element.type === 'collectible' ? '#ffffff' : 'black'),
                    backgroundColor: element.metadata?.backgroundColor || (element.type === 'collectible' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'),
                    padding: (element.metadata?.backgroundColor && element.metadata?.backgroundColor !== 'transparent') ? '0.5rem' : (element.type === 'collectible' ? '1.25rem 1.5rem' : '0'),
                    borderRadius: element.metadata?.borderRadius || (element.type === 'collectible' ? '16px' : '8px'),
                    border: element.metadata?.border || (element.type === 'collectible' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'),
                    boxShadow: element.type === 'collectible' ? '0 8px 32px rgba(0, 0, 0, 0.35)' : undefined,
                    backdropFilter: element.type === 'collectible' ? 'blur(8px)' : undefined,
                    textAlign: element.metadata?.textAlign || 'center',
                    lineHeight: element.metadata?.lineHeight ?? (element.type === 'collectible' ? 1.4 : 1),
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: formatExponents(getTranslatedContent(element, language))
                  }}
                />
              )}

              {element.type === 'image' && (
                <img
                  src={resolveAssetUrl(element.content)}
                  alt="card-element"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: (element.metadata?.isSymbol && element.metadata?.symbolType?.startsWith('shape-')) ? 'fill' : 'contain',
                    opacity: element.metadata?.opacity ?? element.opacity ?? 1,
                    filter: element.metadata?.brightness !== undefined ? `brightness(${element.metadata.brightness}%)` : undefined,
                    pointerEvents: 'none'
                  }}
                />
              )}

              {element.type === 'banner' && (
                <Banner element={element} readOnly={true} />
              )}

              {element.type === 'balloon' && (
                <Balloon element={element} readOnly={true} />
              )}

              {element.type === 'number_line' && (
                <NumberLine element={element} />
              )}

              {element.type === 'result_field' && (
                <ResultField element={element} slide={slide} isPlayMode={true} isSolved={true} />
              )}

              {element.type === 'character_shadow' && (
                <CharacterShadow element={element} />
              )}

              {/* Line with full arrow end & start rendering */}
              {element.type === 'line' && (() => {
                const thickness = element.metadata?.height || 10;
                const color = element.metadata?.symbolColor || '#8B5CF6';
                const lineType = element.metadata?.lineType || 'normal';
                const isCurved = !!element.metadata?.isCurved;

                if (isCurved) {
                  const curvature = element.metadata?.curvature ?? -40;
                  const curveSkew = element.metadata?.curveSkew ?? 0;
                  const widthPx = (element.width / 100) * 360;
                  const heightPx = (element.height / 100) * 640;
                  const y0 = heightPx / 2;

                  const mx = widthPx / 2 + curveSkew;
                  const my = y0 + curvature;

                  const cx = 2 * mx - widthPx / 2;
                  const cy = 2 * my - y0;

                  const pathData = `M 0 ${y0} Q ${cx} ${cy} ${widthPx} ${y0}`;

                  let strokeDash = undefined;
                  let strokeLinecap = 'round';

                  if (lineType === 'dotted') {
                    strokeDash = `${Math.max(1, thickness * 0.15)} ${thickness * 1.6}`;
                    strokeLinecap = 'round';
                  } else if (lineType === 'cutting') {
                    strokeDash = `${thickness * 2.5} ${thickness * 1.5}`;
                    strokeLinecap = 'butt';
                  }

                  let vxStart = 0 - cx;
                  let vyStart = y0 - cy;
                  if (vxStart === 0 && vyStart === 0) { vxStart = -1; vyStart = 0; }
                  const thetaStart = Math.atan2(vyStart, vxStart) * (180 / Math.PI);

                  let vxEnd = widthPx - cx;
                  let vyEnd = y0 - cy;
                  if (vxEnd === 0 && vyEnd === 0) { vxEnd = 1; vyEnd = 0; }
                  const thetaEnd = Math.atan2(vyEnd, vxEnd) * (180 / Math.PI);

                  const arrowSize = Math.max(16, thickness * 2.2);

                  return (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          overflow: 'visible',
                          pointerEvents: 'none'
                        }}
                        viewBox={`0 0 ${widthPx} ${heightPx}`}
                      >
                        <path
                          d={pathData}
                          fill="none"
                          stroke={color}
                          strokeWidth={thickness}
                          strokeDasharray={strokeDash}
                          strokeLinecap={strokeLinecap}
                        />

                        {element.metadata?.startCap === 'arrow' && (
                          <g transform={`translate(0, ${y0}) rotate(${thetaStart})`}>
                            <polygon
                              points={`0,0 ${arrowSize},${-arrowSize * 0.45} ${arrowSize * 0.75},0 ${arrowSize},${arrowSize * 0.45}`}
                              fill={color}
                            />
                          </g>
                        )}
                        {element.metadata?.startCap === 'circle' && (
                          <circle cx={0} cy={y0} r={thickness * 0.9} fill={color} />
                        )}

                        {element.metadata?.endCap === 'arrow' && (
                          <g transform={`translate(${widthPx}, ${y0}) rotate(${thetaEnd})`}>
                            <polygon
                              points={`0,0 ${-arrowSize},${-arrowSize * 0.45} ${-arrowSize * 0.75},0 ${-arrowSize},${arrowSize * 0.45}`}
                              fill={color}
                            />
                          </g>
                        )}
                        {element.metadata?.endCap === 'circle' && (
                          <circle cx={widthPx} cy={y0} r={thickness * 0.9} fill={color} />
                        )}
                      </svg>
                    </div>
                  );
                }

                // Straight Line with Arrow / Circle Caps
                let lineStyle = {
                  width: '100%',
                  height: `${thickness}px`,
                  boxSizing: 'border-box'
                };

                if (lineType === 'normal') {
                  lineStyle.backgroundColor = color;
                  lineStyle.borderRadius = `${thickness / 2}px`;
                } else if (lineType === 'dotted') {
                  lineStyle.backgroundImage = `radial-gradient(circle, ${color} 30%, transparent 35%)`;
                  lineStyle.backgroundSize = `${thickness * 2}px ${thickness}px`;
                  lineStyle.backgroundRepeat = 'repeat-x';
                  lineStyle.backgroundPosition = 'center';
                } else if (lineType === 'cutting') {
                  lineStyle.backgroundImage = `linear-gradient(to right, ${color} 60%, transparent 60%)`;
                  lineStyle.backgroundSize = `${thickness * 3}px ${thickness}px`;
                  lineStyle.backgroundRepeat = 'repeat-x';
                } else {
                  lineStyle.backgroundColor = color;
                  lineStyle.borderRadius = `${thickness / 2}px`;
                }

                const arrowW = Math.max(20, thickness * 2.5);

                return (
                  <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={lineStyle} />
                    {element.metadata?.startCap === 'arrow' && (
                      <svg
                        style={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%, -50%)', width: `${arrowW}px`, height: `${arrowW}px`, overflow: 'visible' }}
                        viewBox="0 0 100 100"
                      >
                        <polygon points="100,0 0,50 100,100" fill={color} />
                      </svg>
                    )}
                    {element.metadata?.startCap === 'circle' && (
                      <div
                        style={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%, -50%)', width: `${thickness * 2}px`, height: `${thickness * 2}px`, borderRadius: '50%', backgroundColor: color }}
                      />
                    )}
                    {element.metadata?.endCap === 'arrow' && (
                      <svg
                        style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: `${arrowW}px`, height: `${arrowW}px`, overflow: 'visible' }}
                        viewBox="0 0 100 100"
                      >
                        <polygon points="0,0 100,50 0,100" fill={color} />
                      </svg>
                    )}
                    {element.metadata?.endCap === 'circle' && (
                      <div
                        style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: `${thickness * 2}px`, height: `${thickness * 2}px`, borderRadius: '50%', backgroundColor: color }}
                      />
                    )}
                  </div>
                );
              })()}

              {element.type === 'quiz' && (
                <div style={{ pointerEvents: 'none' }}>
                  <QuizPlayer data={element} disabled={true} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Scaled preview card thumbnail that perfectly preserves 360x640 layout
  const CardPreview = ({ slide }) => {
    const thumbRef = useRef(null);
    const [thumbScale, setThumbScale] = useState(0.5);

    useEffect(() => {
      const updateScale = () => {
        if (!thumbRef.current) return;
        const rect = thumbRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const baseScale = Math.max(rect.width / 360, rect.height / 640);
          setThumbScale(baseScale * 1.05);
        }
      };

      updateScale();
      const observer = new ResizeObserver(updateScale);
      if (thumbRef.current) observer.observe(thumbRef.current);
      return () => observer.disconnect();
    }, []);

    return (
      <div
        ref={thumbRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '360px',
            height: '640px',
            transform: `translate(-50%, -50%) scale(${thumbScale})`,
            transformOrigin: 'center center',
            pointerEvents: 'none'
          }}
        >
          {renderFullCardSlide(slide, true)}
        </div>
      </div>
    );
  };

  return (
    <div className="cards-view-container">
      {/* Top Header Bar */}
      <div className="cards-top-bar">
        <button
          className="player-top-btn"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
          title="Main Menu"
          aria-label="Main Menu"
        >
          <Home size={22} strokeWidth={2.8} />
        </button>

        <h1 className="cards-page-title">Cards</h1>

        {/* Empty balancing spacer */}
        <div className="cards-top-spacer" />
      </div>

      {/* Scrollable Grid of Collectible Cards */}
      <div className="cards-scroll-area">
        {loading ? (
          <div className="cards-empty-state">
            <span>Loading collectible cards...</span>
          </div>
        ) : cards.length === 0 ? (
          <div className="cards-empty-state">
            <span>No collectible cards found</span>
          </div>
        ) : (
          <div className="cards-grid">
            {cards.map((card) => (
              <div
                key={card.id}
                className="card-tile"
                onClick={() => setSelectedCard(card)}
                role="button"
                tabIndex={0}
                aria-label={`Open card: ${card.concept}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedCard(card);
                  }
                }}
              >
                <div className="card-thumbnail-box">
                  <CardPreview slide={card.slide} />
                </div>
                <span className="card-concept-title">{card.concept}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-Size Isolated Card Modal */}
      {selectedCard && (
        <div className="card-fullscreen-view" role="dialog" aria-modal="true">
          {/* Ambient blurred backdrop */}
          <div
            className="card-fullscreen-backdrop"
            onClick={() => setSelectedCard(null)}
            style={{
              backgroundImage: selectedCard.slide.background
                ? resolveAssetUrl(selectedCard.slide.background)
                : 'none',
              backgroundColor: '#0f172a',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          />

          {/* Scaled 360x640 Canvas Stage */}
          <div
            className="card-fullscreen-stage"
            onClick={(e) => e.stopPropagation()}
            style={{
              '--card-scale': scale * 0.94
            }}
          >
            {renderFullCardSlide(selectedCard.slide, false)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardsView;
