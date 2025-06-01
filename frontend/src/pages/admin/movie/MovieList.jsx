// pages/Admin/Movie/MovieList.js
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import MovieCard from "@components/Admin/Movie/MovieCard";
import MovieDetailsModal from "@components/Admin/Movie/MovieDetailsModal";
import AddToSeriesOffcanvas from "@components/Admin/Movie/AddToSeriesOffcanvas";
import useDropdown from "@hooks/useDropdown";
import authHeader from "@services/auth-header";
import { handleApiError } from "../../../utils/handleApiError";

const MovieList = () => {
    const [movies, setMovies] = useState([]);
    const [visibleMovies, setVisibleMovies] = useState(24);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [series, setSeries] = useState([]);

    const [selectedMovie, setSelectedMovie] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);

    const [episodes, setEpisodes] = useState([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [addEpisodeState, setAddEpisodeState] = useState({});
    const [episodeCountMap, setEpisodeCountMap] = useState({});

    const { openDropdown, toggleDropdown, dropdownRefCallback } = useDropdown();

    const fetchMovies = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/admin/movies", { headers: authHeader() });
            const fetchedMovies = res.data?.movies || [];
            setMovies(fetchedMovies);
            const initialCounts = {};
            fetchedMovies.forEach(movie => {
                initialCounts[movie.id] = parseInt(movie.totalEpisodes, 10) || 0;
            });
            setEpisodeCountMap(initialCounts);
        } catch (error) {
            handleApiError(error, 'tải danh sách phim');
        } finally {
            setLoading(false);
        }
    }, [handleApiError]);

    const fetchSeries = useCallback(async () => {
        try {
            const res = await axios.get('/api/series');
            setSeries(res.data || []);
        } catch (err) {
            handleApiError(err, 'tải danh sách series');
        }
    }, [handleApiError]);

    useEffect(() => {
        fetchMovies();
        fetchSeries();
    }, [fetchMovies, fetchSeries]);

    const fetchEpisodes = useCallback(async (movieId) => {
        if (!movieId) return;
        setLoadingEpisodes(true);
        try {
            const { data } = await axios.get(`/api/episodes/${movieId}`);
            const fetchedEpisodes = data?.episodes || [];
            setEpisodes(fetchedEpisodes);
            setEpisodeCountMap(prev => ({ ...prev, [movieId]: fetchedEpisodes.length }));
        } catch (error) {
            handleApiError(error, `tải tập phim cho phim ID ${movieId}`);
            setEpisodes([]);
        } finally {
            setLoadingEpisodes(false);
        }
    }, [handleApiError]);

    const handleScroll = useCallback(() => {
        const nearBottom = window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 300;
        if (nearBottom && !loading && visibleMovies < movies.length) {
            setVisibleMovies(prev => Math.min(prev + 20, movies.length));
        }
    }, [visibleMovies, movies.length, loading]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const filteredMovies = movies.filter(movie =>
        movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movie.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (movie.subtitles && movie.subtitles.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleShowModal = useCallback((movie) => {
        setSelectedMovie(movie);
        setIsModalOpen(true);
        fetchEpisodes(movie.id);
        setAddEpisodeState(prev => ({ ...prev, [movie.id]: false }));
    }, [fetchEpisodes]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEpisodes([]);
        setLoadingEpisodes(false);
    }, []);

    const toggleShowEpisodeForm = useCallback((movieId) => {
        setAddEpisodeState(prevState => ({
            ...prevState,
            [movieId]: !prevState[movieId]
        }));
    }, []);

    const handleAddEpisode = useCallback(async (episodeData) => {
        if (!selectedMovie) return;

        const currentCount = episodeCountMap[selectedMovie.id] || 0;
        const maxEpisodes = parseInt(selectedMovie.totalEpisodes, 10) || Infinity;

        if (currentCount >= maxEpisodes) {
            toast.info(`Đã đạt số tập tối đa (${maxEpisodes}) cho phim này.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = { ...episodeData, movieId: selectedMovie.id };
            const { data } = await axios.post('/api/episode', payload, { headers: authHeader() });
            const newEpisode = data.episode;

            setEpisodes(prevEpisodes => [newEpisode, ...prevEpisodes]);
            setEpisodeCountMap(prevCount => ({
                ...prevCount,
                [selectedMovie.id]: (prevCount[selectedMovie.id] || 0) + 1
            }));

            toast.success('Thêm tập phim thành công!');
            toggleShowEpisodeForm(selectedMovie.id);

        } catch (error) {
            handleApiError(error, "thêm tập phim");
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedMovie, episodeCountMap, toggleShowEpisodeForm, handleApiError]);

    const handleDeleteMovie = useCallback(async (movieId) => {
        if (!movieId) return;
        const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa phim này và tất cả tập phim liên quan?");
        if (!confirmDelete) return;

        setIsSubmitting(true);
        try {
            await axios.delete(`/api/admin/movies/${movieId}`, { headers: authHeader() });
            setMovies(prevMovies => prevMovies.filter(movie => movie.id !== movieId));
            setEpisodeCountMap(prevCount => {
                const newCount = { ...prevCount };
                delete newCount[movieId];
                return newCount;
            });
            toast.success(`Xóa phim thành công.`);
            closeModal();
        } catch (error) {
            handleApiError(error, `xóa phim ID ${movieId}`);
        } finally {
            setIsSubmitting(false);
        }
    }, [closeModal, handleApiError]);

    const handleShowOffcanvas = useCallback((movie) => {
        setSelectedMovie(movie);
        setIsOffcanvasOpen(true);
    }, []);

    const closeOffcanvas = useCallback(() => {
        setIsOffcanvasOpen(false);
        setSelectedMovie(null);
    }, []);

    const handleAddMovieToSeries = useCallback(async (seriesId) => {
        if (!selectedMovie || !seriesId) return;
        setIsSubmitting(true);
        try {
            await axios.post('/api/admin/movies/add-to-series', {
                movieId: selectedMovie.id,
                seriesId: seriesId,
            }, { headers: authHeader() });

            toast.success(`Đã thêm phim "${selectedMovie.title}" vào series thành công.`);
            setMovies(prev => prev.map(m =>
                m.id === selectedMovie.id ? { ...m, series: { id: seriesId, title: '...' } } : m
            ));
            closeOffcanvas();

        } catch (error) {
            handleApiError(error, `thêm phim vào series`);
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedMovie, closeOffcanvas, handleApiError]);

    return (
        <div className="container-fluid flex-grow-1 container-p-y">
            <div className="card mb-4">
                <h5 className="card-header">Tìm kiếm phim</h5>
                <div className="card-body">
                    <input
                        className="form-control"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nhập tên phim, slug, phụ đề..."
                    />
                </div>
            </div>

            <div className="row g-3">
                {loading && (
                    <div className="col-12 text-center p-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}
                {!loading && filteredMovies.length === 0 && (
                    <div className="col-12 text-center p-5">Không tìm thấy phim nào.</div>
                )}
                {!loading && filteredMovies.slice(0, visibleMovies).map((movie) => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        onShowModal={handleShowModal}
                        onShowOffcanvas={handleShowOffcanvas}
                        onDeleteMovie={handleDeleteMovie}
                        dropdownProps={{
                            openDropdownId: openDropdown,
                            toggleDropdown: toggleDropdown,
                            dropdownRefCallback: dropdownRefCallback
                        }}
                    />
                ))}
                {!loading && visibleMovies < filteredMovies.length && (
                    <div className="col-12 text-center p-3">
                        <div className="spinner-border spinner-border-sm text-secondary" role="status">
                            <span className="visually-hidden">Loading more...</span>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && selectedMovie && (
                <MovieDetailsModal
                    show={isModalOpen}
                    onHide={closeModal}
                    movie={selectedMovie}
                    episodes={episodes}
                    loadingEpisodes={loadingEpisodes}
                    onAddEpisode={handleAddEpisode}
                    onDeleteMovie={handleDeleteMovie}
                    isAddingEpisode={!!addEpisodeState[selectedMovie.id]}
                    onToggleAddEpisodeForm={() => toggleShowEpisodeForm(selectedMovie.id)}
                    episodeCount={episodeCountMap[selectedMovie.id] || 0}
                    maxEpisodes={parseInt(selectedMovie.totalEpisodes, 10) || Infinity}
                    isSubmitting={isSubmitting}
                />
            )}

            {isOffcanvasOpen && selectedMovie && (
                <AddToSeriesOffcanvas
                    show={isOffcanvasOpen}
                    onHide={closeOffcanvas}
                    movie={selectedMovie}
                    seriesList={series}
                    onAddToSeries={handleAddMovieToSeries}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
};

export default MovieList;