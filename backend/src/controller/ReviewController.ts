import ReviewEntity from '../entities/Review';
import { Request, Response } from "express";

class ReviewController {
    async createReview(req: Request, res: Response) {
        try {
            const { owner_id, author_id, rating, comment } = req.body;

            if (!owner_id || !author_id || !rating) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    details: ['owner_id', 'author_id', 'rating']
                });
                return;
            }

            const review = await ReviewEntity.createReview({
                owner_id,
                author_id,
                rating,
                comment: comment || ''
            });

            res.status(201).json({
                success: true,
                data: review
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Failed to create review',
                details: error.message
            });
        }
    }

    async getReviewsForUser(req: Request, res: Response) {
        try {
            const owner_id = Number(req.query.owner_id);

            if (!owner_id || isNaN(owner_id)) {
                res.status(400).json({
                    success: false,
                    error: "Missing or invalid 'owner_id' query parameter"
                });
                return;
            }

            const reviews = await ReviewEntity.getReviewsForUser(owner_id);

            res.json({
                success: true,
                data: reviews
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch reviews',
                details: error.message
            });
        }
    }

    async getReviewsByAuthor(req: Request, res: Response) {
        try {
            const author_id = Number(req.query.author_id);

            if (!author_id || isNaN(author_id)) {
                res.status(400).json({
                    success: false,
                    error: "Missing or invalid 'author_id' query parameter"
                });
                return;
            }

            const reviews = await ReviewEntity.getReviewsByAuthor(author_id);

            res.json({
                success: true,
                data: reviews
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch reviews',
                details: error.message
            });
        }
    }

    async deleteReview(req: Request, res: Response) {
        try {
            const review_id = Number(req.params.review_id);
            const author_id = Number(req.query.author_id);

            if (!review_id || isNaN(review_id)) {
                res.status(400).json({
                    success: false,
                    error: "Invalid 'review_id' path parameter"
                });
                return;
            }

            if (!author_id || isNaN(author_id)) {
                res.status(400).json({
                    success: false,
                    error: "Missing or invalid 'author_id' query parameter"
                });
                return;
            }

            await ReviewEntity.deleteReview(review_id, author_id);

            res.json({
                success: true,
                message: 'Review deleted successfully'
            });
        } catch (error: any) {
            res.status(404).json({
                success: false,
                error: 'Failed to delete review',
                details: error.message
            });
        }
    }
}

export default new ReviewController();
