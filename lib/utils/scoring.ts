/**
 * Calculate base points for a prediction based on actual match result
 *
 * Scoring rules:
 * - Exact score: 3 points
 * - Correct winner + correct goal difference: 2 points (1 + 1)
 * - Correct winner only: 1 point
 * - Incorrect: 0 points
 *
 * Note: The final score is calculated as basePoints * multiplier
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  multiplier: number = 1
): number {
  let basePoints = 0;

  // Exact score match
  if (predictedHome === actualHome && predictedAway === actualAway) {
    basePoints = 3;
  } else {
    const predictedDiff = predictedHome - predictedAway;
    const actualDiff = actualHome - actualAway;

    // Check if winner was guessed correctly (including draws)
    const correctWinner = Math.sign(predictedDiff) === Math.sign(actualDiff);

    if (correctWinner) {
      // 1 point for guessing the winning team
      basePoints = 1;

      // Additional 1 point for correct goal difference
      if (Math.abs(predictedDiff) === Math.abs(actualDiff)) {
        basePoints += 1;
      }
    }
    // Incorrect prediction
    else {
      basePoints = 0;
    }
  }

  // Apply multiplier and return
  return basePoints * multiplier;
}

/**
 * Get a description of how the points were calculated
 */
export function getPointsDescription(basePoints: number, multiplier: number = 1): string {
  const multiplierText = multiplier > 1 ? ` (×${multiplier})` : "";

  if (basePoints === 3) {
    return `Exact score!${multiplierText}`;
  } else if (basePoints === 2) {
    return `Correct winner + goal difference${multiplierText}`;
  } else if (basePoints === 1) {
    return `Correct winner${multiplierText}`;
  } else {
    return "No points";
  }
}

/**
 * Get base points from a prediction (without multiplier)
 */
export function getBasePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): number {
  // Exact score match
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 3;
  }

  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;

  // Check if winner was guessed correctly (including draws)
  const correctWinner = Math.sign(predictedDiff) === Math.sign(actualDiff);

  if (correctWinner) {
    // 1 point for correct winner
    let points = 1;

    // Additional 1 point for correct goal difference
    if (Math.abs(predictedDiff) === Math.abs(actualDiff)) {
      points += 1;
    }

    return points;
  }

  return 0;
}
