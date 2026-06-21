/**
 * @fileOverview Calculates confidence scores for AI-extracted lead data.
 */
export class AIConfidenceScorer {
  static calculate(results: any): number {
    let score = 0;
    const weights: Record<string, number> = {
      name: 0.2,
      email: 0.3,
      companyName: 0.2,
      website: 0.2,
      phone: 0.1
    };

    for (const field in weights) {
      if (results[field] && results[field].length > 2) {
        score += weights[field];
      }
    }

    return Math.round(score * 100);
  }
}
