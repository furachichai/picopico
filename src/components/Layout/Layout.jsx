import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

const Layout = () => {
    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <main className="flex-1 overflow-y-auto pb-20">
                <Outlet />
            </main>
            <BottomNavigation />
        </div>
    );
};

export default Layout;
