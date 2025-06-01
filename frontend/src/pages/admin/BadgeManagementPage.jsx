// src/pages/admin/BadgeManagementPage.jsx
import React from 'react';
import useBadgeManagementLogic from '@hooks/admin/useBadgeManagementLogic';
import BadgeForm from '@components/Admin/Badges/BadgeForm';
import BadgeTable from '@components/Admin/Badges/BadgeTable';
import TableControls from '@components/Admin/Common/TableControls';
import Pagination from '@components/Common/Pagination';

const BadgeManagementPage = () => {
    const {
        editingBadge, isDataLoading, isSubmitting,
        handleSaveBadge, handleDeleteBadge, handleEditBadge, handleDiscardEdit,
        displayedData, totalPages, currentPage, searchTerm, handleSearch,
        requestSort, goToPage, sortConfig, itemsPerPage, handleItemsPerPageChange,
    } = useBadgeManagementLogic();

    return (
        <div className="admin-page-container">
            <div className="admin-page-header">
                <h1 className="admin-page-title">
                    <i className="fas fa-medal icon-before"></i>Quản lý Huy hiệu
                </h1>
            </div>

            <BadgeForm
                initialData={editingBadge}
                onSave={handleSaveBadge}
                onDiscard={handleDiscardEdit}
                isSubmitting={isSubmitting}
                // badges và shopItems không cần thiết cho form này (trừ khi criteria chọn từ đó)
            />

            <div className="admin-content-card mt-4">
                <div className="admin-content-card__header">
                    <h5 className="admin-content-card__title">Danh sách Huy hiệu</h5>
                    <TableControls
                        searchTerm={searchTerm}
                        onSearchChange={(e) => handleSearch(e.target.value)} // handleSearch từ useTableData
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    />
                </div>
                <div className="admin-content-card__body p-0">
                    <BadgeTable
                        displayedData={displayedData}
                        onEdit={handleEditBadge}
                        onDelete={handleDeleteBadge}
                        requestSort={requestSort}
                        sortConfig={sortConfig}
                        isDataLoading={isDataLoading}
                        isSubmittingAction={isSubmitting} // Dùng chung state loading
                    />
                </div>
                {totalPages > 0 && ( // totalPages từ useTableData
                    <div className="admin-content-card__footer">
                        <Pagination
                            currentPage={currentPage} // currentPage từ useTableData
                            totalPages={totalPages}
                            onPageChange={goToPage} // goToPage từ useTableData
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default BadgeManagementPage;