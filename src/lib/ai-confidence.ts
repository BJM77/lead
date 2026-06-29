import { LeadValidator } from './lead-validator';

/**
 * @fileOverview Calculates confidence scores for AI-extracted lead data.
 */
export class AIConfidenceScorer {
  static async calculate(results: any): Promise<number> {
    return await LeadValidator.calculateConfidence(results);
  }
}
