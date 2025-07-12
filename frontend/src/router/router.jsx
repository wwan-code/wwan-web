import React, { Suspense, lazy } from 'react';
import {
    createBrowserRouter,
    createRoutesFromElements,
    Route
} from "react-router-dom";

// --- Layouts and Providers ---
import Root from '@/Root';
import App from "@/App";
import RootAdmin from "@/RootAdmin";
import AdminRoute from "@components/AdminRoute";

// --- LAZY-LOADED PAGES ---

// User-facing pages
const HomePage = lazy(() => import('@pages/HomePage'));
const PlayMovie = lazy(() => import('@pages/PlayMovie'));
const MovieDetailPage = lazy(() => import("@pages/MovieDetailPage"));
const Profile = lazy(() => import("@pages/Profile"));
const AnimePage = lazy(() => import("@pages/AnimePage"));
const GenreMoviesPage = lazy(() => import("@pages/GenreMoviesPage"));
const TrendingAnimePage = lazy(() => import("@pages/TrendingAnimePage"));
const LeaderboardPage = lazy(() => import("@pages/LeaderboardPage"));
const NotificationsPage = lazy(() => import("@pages/NotificationsPage"));
const CollectionsPage = lazy(() => import("@pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("@pages/CollectionDetailPage"));
const ComicsPage = lazy(() => import("@pages/ComicsPage"));
const ComicDetailPage = lazy(() => import("@pages/ComicDetailPage"));
const ComicReaderPage = lazy(() => import("@pages/ComicReaderPage"));
const ComicRankingInterface = lazy(() => import("@pages/ComicRankingInterface"));
const ShopPage = lazy(() => import("@pages/ShopPage"));
const DodgeGame = lazy(() => import("@pages/DodgeGame"));
const AuthPage = lazy(() => import("@pages/AuthPage"));
const UnauthorizedPage = lazy(() => import("@pages/errors/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("@pages/errors/NotFoundPage"));
const MovieCatalogPage = lazy(() => import("@pages/MovieCatalogPage"));

// Admin pages
const Dashboard = lazy(() => import("@pages/admin/Dashboard"));
const GenreManagement = lazy(() => import("@pages/admin/GenreManagement"));
const CountryManagement = lazy(() => import("@pages/admin/CountryManagement"));
const CategoryManagement = lazy(() => import("@pages/admin/CategoryManagement"));
const AddMovie = lazy(() => import("@pages/admin/movie/AddMovie"));
const MovieList = lazy(() => import("@pages/admin/movie/MovieList"));
const EditMovie = lazy(() => import("@pages/admin/movie/EditMovie"));
const SeriesManagement = lazy(() => import("@pages/admin/series/SeriesManagement"));
const ListEpisode = lazy(() => import("@pages/admin/episode/ListEpisode"));
const CommentManagement = lazy(() => import("@pages/admin/CommentManagement"));
const ContentReportsPage = lazy(() => import("@pages/admin/ContentReportsPage"));
const ComicManagement = lazy(() => import("@pages/admin/comics/ComicManagement"));
const AddComic = lazy(() => import("@pages/admin/comics/AddComic"));
const EditComic = lazy(() => import("@pages/admin/comics/EditComic"));
const ChapterManagementPage = lazy(() => import("@pages/admin/comics/chapters/ChapterManagementPage"));
const ComicPageManagement = lazy(() => import("@pages/admin/comics/chapters/ComicPageManagement"));
const ShopItemManagement = lazy(() => import("@pages/admin/ShopItemManagement"));
const BadgeManagementPage = lazy(() => import("@pages/admin/BadgeManagementPage"));


const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/" element={<Root />}>
            {/* --- Public & User Routes --- */}
            <Route element={<App />}>
                <Route index element={<HomePage />} />
                
                <Route path="play/:slug" element={<PlayMovie />} />
                <Route path="album/:slug" element={<MovieDetailPage />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:uuid" element={<Profile />} />
                <Route path="anime" element={<AnimePage />} />
                <Route path="trending" element={<TrendingAnimePage />} />
                <Route path="the-loai/:slug" element={<GenreMoviesPage />} />
                <Route path="bang-xep-hang" element={<LeaderboardPage />} />
                <Route path="thong-bao" element={<NotificationsPage />} />
                <Route path="bo-suu-tap" element={<CollectionsPage />} />
                <Route path="bo-suu-tap/:id" element={<CollectionDetailPage />} />
                <Route path="truyen-tranh" element={<ComicsPage />} />
                <Route path="truyen/:comicSlug" element={<ComicDetailPage />} />
                <Route path="truyen/:comicSlug/chap/:chapterId" element={<ComicReaderPage />} />
                <Route path="xep-hang-truyen" element={<ComicRankingInterface />} />
                <Route path="cua-hang" element={<ShopPage />} />
                
                <Route path="thu-vien-phim" element={<MovieCatalogPage />} />
            </Route>
            <Route path="auth" element={<AuthPage />} />
            <Route path="tro-choi/dodge-game" element={<DodgeGame />} />
            {/* --- Admin Routes --- */}
            <Route path="admin" element={
                <AdminRoute>
                    <RootAdmin />
                </AdminRoute>}>
                <Route index path="dashboard" element={<Dashboard />} />
                <Route path="genre" element={<GenreManagement />} />
                <Route path="category" element={<CategoryManagement />} />
                <Route path="country" element={<CountryManagement />} />
                <Route path="movie/add" element={<AddMovie />} />
                <Route path="movie/list" element={<MovieList />} />
                <Route path="movie/edit/:id" element={<EditMovie />} />
                <Route path="series" element={<SeriesManagement />} />
                <Route path="episode/list" element={<ListEpisode />} />
                <Route path="comments" element={<CommentManagement />} />
                <Route path="reports" element={<ContentReportsPage />} />
                <Route path="comics" element={<ComicManagement />} />
                <Route path="comics/add" element={<AddComic />} />
                <Route path="comics/edit/:comicId" element={<EditComic />} />
                <Route path="comics/:comicId/chapters" element={<ChapterManagementPage />} />
                <Route path="comics/chapters/:chapterId/pages" element={<ComicPageManagement />} />
                <Route path="shop-items" element={<ShopItemManagement />} />
                <Route path="badges" element={<BadgeManagementPage />} />
            </Route>

            {/* --- Error Routes --- */}
            <Route path="/error-not-authorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Route>
    )
);

export default router;