// src/components/Admin/Challenges/ChallengeTable.jsx
import React from 'react';
import classNames from '@utils/classNames';
import { Link } from 'react-router-dom';
// Import SCSS cho bảng nếu có (_admin-table.scss)

const ChallengeTable = ({
    displayedData,
    onEdit,
    onDelete,
    requestSort,
    sortConfig,
    isDataLoading,
    isSubmittingDelete, // State loading riêng cho xóa
}) => {
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? (
            <i className="fas fa-sort-up ms-1"></i>
        ) : (
            <i className="fas fa-sort-down ms-1"></i>
        );
    };

    const getHeaderStyle = (key) => ({
        cursor: 'pointer',
        color: sortConfig.key === key ? 'var(--bs-primary)' : 'var(--bs-heading-color)',
        transition: 'color 0.3s ease',
    });

    return (
        <div className="table-responsive-custom admin-table-wrapper"> {/* Class chung cho table admin */}
            <table className="table custom-table">
                <thead>
                    <tr>
                        <th onClick={() => requestSort('title')} style={getHeaderStyle('title')}>Tên Thử Thách {getSortIcon('title')}</th>
                        <th onClick={() => requestSort('type')} style={getHeaderStyle('type')}>Loại {getSortIcon('type')}</th>
                        <th onClick={() => requestSort('targetCount')} style={getHeaderStyle('targetCount')} className="text-center">Mục tiêu {getSortIcon('targetCount')}</th>
                        <th onClick={() => requestSort('pointsReward')} style={getHeaderStyle('pointsReward')} className="text-center">Điểm {getSortIcon('pointsReward')}</th>
                        <th onClick={() => requestSort('isActive')} style={getHeaderStyle('isActive')} className="text-center">Trạng thái {getSortIcon('isActive')}</th>
                        <th onClick={() => requestSort('endDate')} style={getHeaderStyle('endDate')} className="text-center">Ngày KT {getSortIcon('endDate')}</th>
                        <th className="text-center">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {isDataLoading ? (
                        <tr><td colSpan="7" className="text-center p-5"><div className="spinner-eff"></div></td></tr>
                    ) : displayedData.length === 0 ? (
                        <tr><td colSpan="7" className="text-center p-5 no-content-message">Không có thử thách nào.</td></tr>
                    ) : (
                        displayedData.map((challenge) => (
                            <tr key={challenge.id}>
                                <td>
                                    <Link to={`/challenges/${challenge.slug || challenge.id}`} target="_blank" className="fw-medium" title={challenge.description}>
                                        {challenge.title}
                                    </Link>
                                    {challenge.slug && <small className="d-block text-muted">/{challenge.slug}</small>}
                                </td>
                                <td>{challenge.type}</td>
                                <td className="text-center">{challenge.targetCount}</td>
                                <td className="text-center">{challenge.pointsReward?.toLocaleString()}</td>
                                <td className="text-center">
                                    <span className={`badge-custom ${challenge.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                        {challenge.isActive ? 'Đang chạy' : 'Ngừng'}
                                    </span>
                                </td>
                                <td className="text-center">
                                    {challenge.endDate ? new Date(challenge.endDate).toLocaleDateString('vi-VN') : (challenge.durationForUserDays ? `${challenge.durationForUserDays} ngày/user` : 'Vô hạn')}
                                </td>
                                <td className="text-center table-actions">
                                    <button className="btn-icon btn--sm btn--outline-primary me-1" onClick={() => onEdit(challenge.id)} disabled={isSubmittingDelete} title="Sửa">
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button className="btn-icon btn--sm btn--outline-danger" onClick={() => onDelete(challenge.id)} disabled={isSubmittingDelete} title="Xóa">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ChallengeTable;