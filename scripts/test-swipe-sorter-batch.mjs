import assert from 'node:assert';
import { parseBatchCards, generateBatchCards } from '../src/cartridges/SwipeSorter/swipeSorterUtils.js';

console.log('Testing swipeSorterUtils...');

// Test 1: Empty text
{
    const res = parseBatchCards('');
    assert.deepStrictEqual(res, { left: [], right: [] });
    const cards = generateBatchCards({ batch: '' });
    assert.deepStrictEqual(cards, []);
    console.log('✓ Test 1: Empty text passed');
}

// Test 2: Standard two groups separated by blank line
{
    const text = `
    Top 1
    Top 2
    Top 3

    Bottom 1
    Bottom 2
    `;
    const res = parseBatchCards(text);
    assert.deepStrictEqual(res.left, ['Top 1', 'Top 2', 'Top 3']);
    assert.deepStrictEqual(res.right, ['Bottom 1', 'Bottom 2']);
    console.log('✓ Test 2: Standard two groups passed');
}

// Test 3: Multiple blank lines between groups
{
    const text = `Top 1
Top 2


Bottom 1
Bottom 2`;
    const res = parseBatchCards(text);
    assert.deepStrictEqual(res.left, ['Top 1', 'Top 2']);
    assert.deepStrictEqual(res.right, ['Bottom 1', 'Bottom 2']);
    console.log('✓ Test 3: Multiple blank lines passed');
}

// Test 4: Linear mode interleaves top and bottom
{
    const text = `L1
L2
L3

R1
R2`;
    const cards = generateBatchCards({ batch: text, order: 'linear' });
    assert.strictEqual(cards.length, 5);
    assert.strictEqual(cards[0].text, 'L1');
    assert.strictEqual(cards[0].correctSide, 'left');
    assert.strictEqual(cards[1].text, 'R1');
    assert.strictEqual(cards[1].correctSide, 'right');
    assert.strictEqual(cards[2].text, 'L2');
    assert.strictEqual(cards[2].correctSide, 'left');
    assert.strictEqual(cards[3].text, 'R2');
    assert.strictEqual(cards[3].correctSide, 'right');
    assert.strictEqual(cards[4].text, 'L3');
    assert.strictEqual(cards[4].correctSide, 'left');
    console.log('✓ Test 4: Linear interleaving passed');
}

// Test 5: Linear mode with totalCards limit
{
    const text = `L1
L2
L3

R1
R2
R3`;
    const cards = generateBatchCards({ batch: text, order: 'linear', totalCards: 3 });
    assert.strictEqual(cards.length, 3);
    assert.strictEqual(cards[0].text, 'L1');
    assert.strictEqual(cards[1].text, 'R1');
    assert.strictEqual(cards[2].text, 'L2');
    console.log('✓ Test 5: Linear with totalCards limit passed');
}

// Test 6: Random mode with totalCards limit
{
    const text = `L1
L2
L3
L4
L5

R1
R2
R3
R4
R5`;
    const cards = generateBatchCards({ batch: text, order: 'random', totalCards: 4 });
    assert.strictEqual(cards.length, 4);
    const leftCount = cards.filter(c => c.correctSide === 'left').length;
    const rightCount = cards.filter(c => c.correctSide === 'right').length;
    assert.strictEqual(leftCount, 2);
    assert.strictEqual(rightCount, 2);
    console.log('✓ Test 6: Random mode balanced selection passed');
}

// Test 7: Random mode deterministic preview
{
    const text = `L1
L2
L3

R1
R2
R3`;
    const cards1 = generateBatchCards({ batch: text, order: 'random', isDeterministic: true });
    const cards2 = generateBatchCards({ batch: text, order: 'random', isDeterministic: true });
    assert.deepStrictEqual(cards1, cards2);
    console.log('✓ Test 7: Deterministic preview passed');
}

// Test 8: TotalCards exceeding available cards clamps to max
{
    const text = `L1

R1`;
    const cards = generateBatchCards({ batch: text, order: 'random', totalCards: 50 });
    assert.strictEqual(cards.length, 2);
    console.log('✓ Test 8: TotalCards clamp passed');
}

console.log('All swipeSorterUtils tests passed!');
