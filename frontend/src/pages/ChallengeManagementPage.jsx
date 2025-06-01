// src/pages/admin/ChallengeManagementPage.jsx
import React from 'react';
import useChallengeManagementLogic from '@hooks/admin/useChallengeManagementLogic';
import ChallengeForm from '@components/Admin/Challenges/ChallengeForm';
import ChallengeTable from '@components/Admin/Challenges/ChallengeTable';
import TableControls from '@components/Admin/Common/TableControls';
import Pagination from '@components/Common/Pagination';

import '@assets/scss/admin/_admin-layout.scss';

const ChallengeManagementPage = () => {
    const {
        editingChallenge,
        isDataLoading,
        isSubmitting,
        handleSaveChallenge,
        handleDeleteChallenge,
        handleEditChallenge,
        handleDiscardEdit,
        displayedData,
        totalPages,
        currentPage,
        searchTerm,
        handleSearch,
        requestSort,
        goToPage,
        sortConfig,
        itemsPerPage,
        handleItemsPerPageChange,
        badges,
        shopItems,
    } = useChallengeManagementLogic();

    return (
        <div className="admin-page-container"> {/* Class chung cho trang admin */}
            <div className="admin-page-header">
                <h1 className="admin-page-title">
                    <i className="fas fa-tasks icon-before"></i>Quản lý Thử Thách
                </h1>
            </div>

            <ChallengeForm
                initialData={editingChallenge}
                onSave={handleSaveChallenge}
                onDiscard={handleDiscardEdit}
                isSubmitting={isSubmitting}
                badges={badges}
                shopItems={shopItems}
            />

            <div className="admin-content-card mt-4"> {/* Card chứa bảng */}
                <div className="admin-content-card__header">
                    <h5 className="admin-content-card__title">Danh sách Thử Thách</h5>
                    <TableControls // Component tìm kiếm và số lượng item/trang
                        searchTerm={searchTerm}
                        onSearchChange={(e) => handleSearch(e.target.value)}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                        // Bỏ các props không dùng đến như totalEntries, filteredEntries, startEntry, endEntry
                    />
                </div>
                <div className="admin-content-card__body p-0"> {/* Bỏ padding body của card để table full width */}
                    <ChallengeTable
                        displayedData={displayedData}
                        onEdit={handleEditChallenge}
                        onDelete={handleDeleteChallenge}
                        requestSort={requestSort}
                        sortConfig={sortConfig}
                        isDataLoading={isDataLoading}
                        isSubmittingDelete={isSubmitting} // Giả sử dùng chung isSubmitting
                    />
                </div>
                {totalPages > 0 && (
                    <div className="admin-content-card__footer">
                        {/* Thông tin phân trang (có thể thêm vào TableControls hoặc để riêng) */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={goToPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChallengeManagementPage;