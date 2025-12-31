import pool from '../schema/database';

export interface ReviewInput {
    owner_id: number;
    author_id: number;
    rating: number;
    comment: string;
}

export interface ReviewResult {
    review_id: number;
    owner_id: number;
    author_id: number;
    rating: number;
    comment: string;
    created_on: Date;
    owner_username?: string;
    author_username?: string;
}

class ReviewEntity {
    static async createReview(input: ReviewInput): Promise<ReviewResult> {
        const { owner_id, author_id, rating, comment } = input;

        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        // Prevent self-review
        if (owner_id === author_id) {
            throw new Error('You cannot review yourself');
        }

        const result = await pool.query(
            `
            INSERT INTO fyp_25_s4_20.review (owner_id, author_id, rating, comment, created_on)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING review_id, owner_id, author_id, rating, comment, created_on;
            `,
            [owner_id, author_id, rating, comment]
        );

        return result.rows[0];
    }

    static async getReviewsForUser(owner_id: number): Promise<ReviewResult[]> {
        const result = await pool.query(
            `
            SELECT
                r.review_id,
                r.owner_id,
                r.author_id,
                r.rating,
                r.comment,
                r.created_on,
                o.username AS owner_username,
                a.username AS author_username
            FROM fyp_25_s4_20.review r
            LEFT JOIN fyp_25_s4_20.users o ON r.owner_id = o.user_id
            LEFT JOIN fyp_25_s4_20.users a ON r.author_id = a.user_id
            WHERE r.owner_id = $1
            ORDER BY r.created_on DESC;
            `,
            [owner_id]
        );

        return result.rows;
    }

    static async getReviewsByAuthor(author_id: number): Promise<ReviewResult[]> {
        const result = await pool.query(
            `
            SELECT
                r.review_id,
                r.owner_id,
                r.author_id,
                r.rating,
                r.comment,
                r.created_on,
                o.username AS owner_username,
                a.username AS author_username
            FROM fyp_25_s4_20.review r
            LEFT JOIN fyp_25_s4_20.users o ON r.owner_id = o.user_id
            LEFT JOIN fyp_25_s4_20.users a ON r.author_id = a.user_id
            WHERE r.author_id = $1
            ORDER BY r.created_on DESC;
            `,
            [author_id]
        );

        return result.rows;
    }

    static async deleteReview(review_id: number, author_id: number): Promise<boolean> {
        const result = await pool.query(
            `
            DELETE FROM fyp_25_s4_20.review
            WHERE review_id = $1 AND author_id = $2
            RETURNING review_id;
            `,
            [review_id, author_id]
        );

        if (result.rows.length === 0) {
            throw new Error('Review not found or you are not the author');
        }

        return true;
    }
}

export default ReviewEntity;
