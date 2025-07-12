// src/components/Comics/SingleComic.jsx
import { Link } from 'react-router-dom';
import CustomOverlayTrigger from '@components/CustomTooltip/CustomOverlayTrigger';
import ComicTooltipContent from './ComicTooltipContent';
import { formatViewCount } from '@utils/formatViewCount';
import { memo } from 'react';

const truncateTextSCCard = (text, maxLength) => {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

const SingleComic = memo(({ comic }) => {
    if (!comic) return null;

    const coverImageUrl = comic.coverImage
        ? (comic.coverImage.startsWith('http') ? comic.coverImage : `${process.env.REACT_APP_API_URL_IMAGE}/${comic.coverImage}`)
        : '';

    const lastChapter = comic.chapters && comic.chapters.length > 0
        ? comic.chapters[0]
        : null;

    
    
    const tooltipId = `comic-tooltip-${comic.uuid || comic.id}`;

    return (
        <CustomOverlayTrigger
            placement="right-start"
            trigger="hover"
            delay={{ show: 250, hide: 150 }}
            offset={[0, 16]}
            tooltip={<ComicTooltipContent comic={comic} />}
            tooltipId={tooltipId}
            tooltipClassName="comic-tooltip-wrapper"
        >
            <article className="manga-card">
                <div className="manga-card__image-container">
                    <Link to={`/truyen/${comic.slug}`} className="manga-card__image-link">
                        <div className="manga-card__image-wrapper">
                            <img
                                src={coverImageUrl}
                                alt={comic.title}
                                className="manga-card__image"
                                loading="lazy"
                            />
                            <div className="manga-card__image-overlay">
                                <div className="manga-card__read-button">
                                    <i className="fas fa-book-open"></i>
                                    <span>Đọc ngay</span>
                                </div>
                            </div>
                            <div className="manga-card__cover-mark">
                                <h3 className="manga-card__cover-mark-title" title={comic.title}>
                                    {truncateTextSCCard(comic.title, 45)}
                                </h3>
                                <div className="manga-card__cover-mark-stats">
                                    <span className="manga-card__cover-mark-views">
                                        <i className="fas fa-eye"></i>
                                        {formatViewCount(comic.views)}
                                    </span>
                                    {lastChapter && (
                                        <span className="manga-card__cover-mark-chapter">
                                            <i className="fas fa-bookmark"></i>
                                            Ch. {lastChapter.chapterNumber}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </article>
        </CustomOverlayTrigger>
    );
});

export default SingleComic;