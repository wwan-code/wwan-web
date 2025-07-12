import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppProvider } from '@contexts/AppContext';
import "@assets/scss/core.scss";
import "@assets/scss/style.css";

const Root = () => {
    return (
        <AppProvider>
            <Outlet />
        </AppProvider>
    );
};

export default Root;