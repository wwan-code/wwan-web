// pages/Admin/Movie/EditMovie.js
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

import MovieInfoForm from "@components/Admin/MovieForms/MovieInfoForm";
import MovieMetaForm from "@components/Admin/MovieForms/MovieMetaForm";
import MovieImageUploader from "@components/Admin/MovieForms/MovieImageUploader";
import AddItemOffcanvas from "@components/Admin/MovieForms/AddItemOffcanvas";

import useSlug from "@hooks/useSlug";
import authHeader from "@services/auth-header";
import { handleApiError } from "@utils/handleApiError";

const initialMovieData = {
    title: '', subTitle: '', slug: '', duration: '', quality: 4,
    subtitles: '', status: 1, views: 0, totalEpisodes: '', description: '',
    genreIds: [], countryId: '', categoryId: '', belongToCategory: 0,
    hasSection: 0, year: new Date().getFullYear(), premiere: '', classification: '', trailer: ''
};

const EditMovie = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(initialMovieData);
    const [genres, setGenres] = useState([]);
    const [countries, setCountries] = useState([]);
    const [categories, setCategories] = useState([]);
    const [picture, setPicture] = useState({ image: null, posterImage: null });
    const [initialImageUrls, setInitialImageUrls] = useState({ image: null, posterImage: null });
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [showOffcanvas, setShowOffcanvas] = useState(false);
    const [offcanvasType, setOffcanvasType] = useState(null);

    const { slug, setInput } = useSlug(300);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!id) {
                toast.error("Không tìm thấy ID phim.");
                setIsFetching(false);
                return;
            }
            setIsFetching(true);
            try {
                const [movieRes, genresRes, countriesRes, categoriesRes] = await Promise.all([
                    axios.get(`/api/admin/movies/${id}`, { headers: authHeader() }),
                    axios.get(`/api/genres`),
                    axios.get(`/api/countries`),
                    axios.get(`/api/categories`)
                ]);

                if (!movieRes.data || !movieRes.data.movie) {
                    throw new Error("Không tìm thấy dữ liệu phim.");
                }
                const movie = movieRes.data.movie;
                const allGenres = genresRes.data || [];
                const allCountries = countriesRes.data || [];
                const allCategories = categoriesRes.data || [];

                setGenres(allGenres);
                setCountries(allCountries);
                setCategories(allCategories);
                console.log(movieRes.data.genreIds)
                setData({
                    title: movie.title || '',
                    subTitle: movie.subTitle || '',
                    slug: movie.slug || '',
                    duration: movie.duration || '',
                    quality: movie.quality ?? 4,
                    subtitles: movie.subtitles || '',
                    status: movie.status ?? 1,
                    views: movie.views || 0,
                    totalEpisodes: movie.totalEpisodes || '',
                    description: movie.description || '',
                    genreIds: movieRes.data.genreIds || [],
                    countryId: movie.countryId || (allCountries.length > 0 ? allCountries[0].id : ''),
                    categoryId: movie.categoryId || (allCategories.length > 0 ? allCategories[0].id : ''),
                    belongToCategory: movie.belongToCategory ?? 0,
                    hasSection: movie.hasSection ?? 0,
                    year: movie.year || new Date().getFullYear(),
                    premiere: movie.premiere ? new Date(movie.premiere).toISOString().split('T')[0] : '',
                    classification: movie.classification || ''
                });

                setInput(movie.title || '');

                const currentSelectedGenres = allGenres.filter(genre => movieRes.data.genreIds?.includes(genre.id));
                setSelectedGenres(currentSelectedGenres);

                setInitialImageUrls({ image: movie.image || null, posterImage: movie.poster || null });

            } catch (error) {
                handleApiError(error, `tải dữ liệu phim ID ${id}`);
                navigate('/admin/movie/list');
            } finally {
                setIsFetching(false);
            }
        };

        fetchAllData();
    }, [id, navigate, setInput]);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setData((prevData) => ({
            ...prevData,
            [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
        }));
    }, []);

    const handleTitleChange = useCallback((e) => {
        const title = e.target.value;
        setData((prev) => ({ ...prev, title }));
        setInput(title);
    }, [setInput]);

    useEffect(() => {
        if (data.title && slug !== data.slug) {
            setData((prev) => ({ ...prev, slug }));
        }
    }, [slug, data.title, data.slug]);

    useEffect(() => {
        const newGenreIds = selectedGenres.map((genre) => genre.id);
        if (JSON.stringify(newGenreIds) !== JSON.stringify(data.genreIds)) {
            setData((prev) => ({ ...prev, genreIds: newGenreIds }));
        }
    }, [selectedGenres, data.genreIds]);


    const handlePictureChange = useCallback((pictureType, file) => {
        setPicture(prev => ({ ...prev, [pictureType]: file }));
        if (file && initialImageUrls[pictureType]) {
            setInitialImageUrls(prev => ({ ...prev, [pictureType]: null }));
        }
    }, [initialImageUrls]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!data.title.trim()) {
            toast.warn("Tên phim không được để trống.");
            return;
        }
        if (!initialImageUrls.image && !picture.image) {
            toast.warn("Vui lòng cung cấp hình ảnh chính cho phim.");
            return;
        }
        if (!initialImageUrls.posterImage && !picture.posterImage) {
            toast.warn("Vui lòng cung cấp ảnh poster cho phim.");
            return;
        }


        setIsSubmitting(true);
        const formDataToSend = new FormData();

        for (let key in data) {
            if (key === 'genreIds') {
                data.genreIds.forEach(id => formDataToSend.append('genreIds[]', id));
            } else if (key !== 'slug' && (data[key] !== null && typeof data[key] !== 'undefined')) {
                formDataToSend.append(key, data[key]);
            }
        }
        if (data.slug) {
            formDataToSend.append('slug', data.slug);
        }

        if (picture.image instanceof File) {
            formDataToSend.append('image', picture.image);
        }
        if (picture.posterImage instanceof File) {
            formDataToSend.append('poster', picture.posterImage);
        }

        try {
            const url = `/api/admin/movies/${id}`;
            await axios.put(url, formDataToSend, {
                headers: {
                    ...authHeader()
                }
            });

            toast.success("Đã cập nhật phim thành công!");
            setPicture({ image: null, posterImage: null });
            setTimeout(() => navigate('/admin/movie/list'), 500);

        } catch (error) {
            handleApiError(error, "cập nhật phim");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShowOffcanvas = useCallback((type) => {
        setOffcanvasType(type);
        setShowOffcanvas(true);
    }, []);

    const handleCloseOffcanvas = useCallback(() => {
        setShowOffcanvas(false);
        setOffcanvasType(null);
    }, []);

    const handleItemAdded = useCallback((type, newItem) => {
        if (!newItem || !type) return;
        switch (type) {
            case 'genre':
                setGenres(prev => [...prev, newItem]);
                setSelectedGenres(prev => [...prev, { id: newItem.id, title: newItem.title }]);
                break;
            case 'category':
                setCategories(prev => [...prev, newItem]);
                setData(prev => ({ ...prev, categoryId: newItem.id }));
                break;
            case 'country':
                setCountries(prev => [...prev, newItem]);
                setData(prev => ({ ...prev, countryId: newItem.id }));
                break;
            default:
                break;
        }
        handleCloseOffcanvas();
        toast.success(`Đã thêm ${type} mới thành công!`);
    }, [handleCloseOffcanvas]);

    return (
        <>
            <div className="flex-grow-1 container-p-y container-fluid add-edit-content-page">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 row-gap-4 page-actions-header">
                    <div className="d-flex flex-column justify-content-center">
                        <h4 className="mb-0 page-main-title">Chỉnh sửa Phim: {isFetching ? '...' : data.title}</h4>
                    </div>
                    <div className="d-flex align-content-center flex-wrap gap-4">
                        <button className="btn btn-label-secondary" onClick={() => navigate('/admin/movie/list')} disabled={isSubmitting}>
                            <i className="fas fa-chevron-left me-2"></i> Quay lại
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={isSubmitting || isFetching}>
                            {isSubmitting ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-save me-2"></i>}
                            {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </div>

                {isFetching ? (
                    <div className="d-flex justify-content-center align-items-center position-absolute top-0 bottom-0 start-0 end-0">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <div className="row">
                        <div className="col-12 col-lg-8">
                            <MovieInfoForm
                                data={data}
                                slug={data.slug}
                                onTitleChange={handleTitleChange}
                                onInputChange={handleChange}
                            />
                            <MovieImageUploader
                                picture={picture}
                                initialImageUrls={initialImageUrls}
                                onPictureChange={handlePictureChange}
                            />
                        </div>

                        <div className="col-12 col-lg-4">
                            <MovieMetaForm
                                data={data}
                                onInputChange={handleChange}
                                genres={genres}
                                countries={countries}
                                categories={categories}
                                selectedGenres={selectedGenres}
                                onSelectedGenresChange={setSelectedGenres}
                                onShowAddItemOffcanvas={handleShowOffcanvas}
                            />
                        </div>
                    </div>
                )}
            </div>

            <AddItemOffcanvas
                show={showOffcanvas}
                onHide={handleCloseOffcanvas}
                type={offcanvasType}
                onItemAdded={handleItemAdded}
                handleApiError={handleApiError}
            />
        </>
    );
};

export default EditMovie;