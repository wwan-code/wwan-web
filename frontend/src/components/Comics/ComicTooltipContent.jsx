import PropTypes from 'prop-types';
import { formatDistanceToNow } from '@utils/dateUtils';

const truncateText = (text, maxLength) => {
    if (!text || typeof text !== 'string') return 'Không có mô tả.';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

const ComicTooltipContent = ({ comic }) => {
    if (!comic) return null;

    const statusMap = {
        ongoing: { text: "Đang tiến hành", classKey: "ongoing", icon: "fas fa-play-circle" },
        completed: { text: "Hoàn thành", classKey: "completed", icon: "fas fa-check-circle" },
        paused: { text: "Tạm dừng", classKey: "paused", icon: "fas fa-pause-circle" },
        dropped: { text: "Đã drop", classKey: "dropped", icon: "fas fa-times-circle" },
    };
    const statusInfo = statusMap[comic.status] || { text: comic.status, classKey: "unknown", icon: "fas fa-question-circle" };

    const genres = comic.genres || [];

    return (
        <div className="comic-tooltip-content">
            <h4 className="comic-tooltip-title">{comic.title}</h4>
            
            <div className="comic-tooltip-stats">
                <span>{comic.year || 'N/A'}</span>
                <span className="separator">|</span>
                <span className={`status-badge status-${comic.status}`}>
                    <i className={`${statusInfo.icon} ${statusInfo.classKey} me-1`}></i>
                    {statusInfo.text}
                </span>
            </div>

            <p className="comic-tooltip-description">
                {truncateText(comic.description, 150)}
            </p>

            {genres.length > 0 && (
                <div className="comic-tooltip-genres">
                    {genres.slice(0, 3).map(genre => (
                        <span key={genre.id} className="genre-tag">{genre.title}</span>
                    ))}
                    {genres.length > 3 && (
                        <span className="genre-tag more">+{genres.length - 3}</span>
                    )}
                </div>
            )}
            
            <div className="comic-tooltip-meta">
                {comic.author && <div><strong>Tác giả:</strong> {comic.author}</div>}
                {comic.artist && <div><strong>Họa sĩ:</strong> {comic.artist}</div>}
            </div>

            {comic.lastChapterUpdatedAt && (
                 <div className="comic-tooltip-updated">
                    Cập nhật: {formatDistanceToNow(comic.lastChapterUpdatedAt)}
                </div>
            )}
        </div>
    );
};

ComicTooltipContent.propTypes = {
    comic: PropTypes.shape({
        title: PropTypes.string,
        year: PropTypes.number,
        status: PropTypes.string,
        description: PropTypes.string,
        genres: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.any.isRequired,
            name: PropTypes.string,
        })),
        author: PropTypes.string,
        artist: PropTypes.string,
        lastChapterUpdatedAt: PropTypes.string,
    }).isRequired,
};

export default ComicTooltipContent; 