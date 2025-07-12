import db from '../models/index.js';

const Comment = db.Comment;
const User = db.User;
const Episode = db.Episode;
const Movie = db.Movie;
const Comic = db.Comic;
const Chapter = db.Chapter;

export const getAllComments = async (req, res) => {
    try {
        const comments = await Comment.findAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id',  'uuid', 'name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Lấy thông tin nội dung cho từng comment
        const commentsWithContent = await Promise.all(comments.map(async (comment) => {
            let contentInfo = null;
            if (comment.contentType === 'episode') {
                const episode = await Episode.findByPk(comment.contentId, {
                    attributes: ['id', 'episodeNumber', 'movieId'],
                    include: [{ model: Movie, attributes: ['id', 'title'] }]
                });
                if (episode) {
                    contentInfo = {
                        type: 'episode',
                        id: episode.id,
                        episodeNumber: episode.episodeNumber,
                        movie: episode.Movie ? { id: episode.Movie.id, title: episode.Movie.title } : null
                    };
                }
            } else if (comment.contentType === 'movie') {
                const movie = await Movie.findByPk(comment.contentId, { attributes: ['id', 'title'] });
                if (movie) {
                    contentInfo = { type: 'movie', id: movie.id, title: movie.title };
                }
            } else if (comment.contentType === 'comic') {
                const comic = await Comic.findByPk(comment.contentId, { attributes: ['id', 'title'] });
                if (comic) {
                    contentInfo = { type: 'comic', id: comic.id, title: comic.title };
                }
            } else if (comment.contentType === 'chapter') {
                const chapter = await Chapter.findByPk(comment.contentId, {
                    attributes: ['id', 'chapterNumber', 'comicId'],
                    include: [{ model: Comic, as: 'comic', attributes: ['id', 'title'] }]
                });
                if (chapter) {
                    contentInfo = {
                        type: 'chapter',
                        id: chapter.id,
                        chapterNumber: chapter.chapterNumber,
                        comic: chapter.comic ? { id: chapter.comic.id, title: chapter.comic.title } : null
                    };
                }
            }
            // Gắn contentInfo vào comment
            const commentJSON = comment.toJSON();
            commentJSON.contentInfo = contentInfo;
            return commentJSON;
        }));

        res.status(200).json(commentsWithContent);

    } catch (error) {
        console.error("Lỗi khi lấy tất cả bình luận:", error);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách bình luận." });
    }
};

// Cập nhật trạng thái ẩn/hiện bình luận
export const updateCommentStatus = async (req, res) => {
    const commentId = req.params.id;
    const { is_hidden } = req.body;

    try {
        const comment = await Comment.findByPk(commentId);

        if (!comment) {
            return res.status(404).json({ message: "Không tìm thấy bình luận." });
        }

        comment.is_hidden = is_hidden; // Cập nhật trạng thái
        await comment.save(); // Lưu thay đổi vào DB

        res.status(200).json({ message: "Cập nhật trạng thái bình luận thành công.", comment });

    } catch (error) {
        console.error(`Lỗi khi cập nhật trạng thái bình luận ${commentId}:`, error);
        res.status(500).json({ message: "Lỗi server khi cập nhật trạng thái bình luận." });
    }
};

// Xóa bình luận
export const deleteComment = async (req, res) => {
    const commentId = req.params.id;

    try {
        const comment = await Comment.findByPk(commentId);

        if (!comment) {
            return res.status(404).json({ message: "Không tìm thấy bình luận." });
        }

        // Xóa bình luận (và các phản hồi của nó nếu cần - tùy thuộc vào cấu hình cascade delete trong DB hoặc bạn tự xử lý)
        // Nếu sử dụng cascade delete ở mức DB, chỉ cần xóa comment gốc.
        // Nếu không, bạn có thể cần xóa các phản hồi trước:
        // await Comment.destroy({ where: { parentId: commentId } });
        await comment.destroy(); // Xóa bình luận gốc

        res.status(200).json({ message: "Xóa bình luận thành công." });

    } catch (error) {
        console.error(`Lỗi khi xóa bình luận ${commentId}:`, error);
        res.status(500).json({ message: "Lỗi server khi xóa bình luận." });
    }
};