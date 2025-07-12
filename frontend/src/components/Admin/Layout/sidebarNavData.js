// src/components/Admin/layout/sidebarNavData.js
// Centralised definition of Admin sidebar navigation structure.
// Each node can be of type: 'title' | 'item' | 'group'.
//  - For 'item' nodes provide { to, icon, label }
//  - For 'group' nodes provide { id, basePath, icon, label, items: [ { to, label } ] }
// Keeping the structure declarative makes Sidebar easier to maintain & extend.

import {
  FaTachometerAlt,
  FaIcons,
  FaLayerGroup,
  FaGlobe,
  FaFilm,
  FaPhotoVideo,
  FaListUl,
  FaBookOpen,
  FaComments,
  FaRegFlag,
  FaUsersCog,
  FaStore,
  FaMedal,
} from 'react-icons/fa';

const sidebarNavData = [
  { type: 'item', to: '/admin/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },

  { type: 'title', label: 'Phân loại dữ liệu' },
  { type: 'item', to: '/admin/genre', icon: FaIcons, label: 'Thể Loại' },
  { type: 'item', to: '/admin/category', icon: FaLayerGroup, label: 'Danh mục' },
  { type: 'item', to: '/admin/country', icon: FaGlobe, label: 'Quốc gia' },

  { type: 'title', label: 'Quản lý Nội dung' },
  {
    type: 'group',
    id: 'movie',
    basePath: '/admin/movie',
    icon: FaFilm,
    label: 'Phim',
    items: [
      { to: '/admin/movie/add', label: 'Thêm Phim Mới' },
      { to: '/admin/movie/list', label: 'Danh sách Phim' },
    ],
  },
  { type: 'item', to: '/admin/series', icon: FaPhotoVideo, label: 'Series' },
  { type: 'item', to: '/admin/episode/list', icon: FaListUl, label: 'List Episode' },
  {
    type: 'group',
    id: 'comics',
    basePath: '/admin/comics',
    icon: FaBookOpen,
    label: 'Truyện tranh',
    items: [
      { to: '/admin/comics/add', label: 'Thêm Truyện Mới' },
      { to: '/admin/comics', label: 'Danh sách Truyện' },
    ],
  },

  { type: 'title', label: 'Tương tác Người dùng' },
  { type: 'item', to: '/admin/comments', icon: FaComments, label: 'Bình luận' },
  { type: 'item', to: '/admin/reports', icon: FaRegFlag, label: 'Báo cáo Nội dung' },
  { type: 'item', to: '/admin/users', icon: FaUsersCog, label: 'Người dùng' },

  { type: 'title', label: 'Gamification' },
  { type: 'item', to: '/admin/shop-items', icon: FaStore, label: 'Quản lý Cửa hàng' },
  { type: 'item', to: '/admin/badges', icon: FaMedal, label: 'Quản lý Huy hiệu' },
];

export default sidebarNavData; 