import { NavLink } from 'react-router-dom';
import { BookOpen, Compass, Settings } from 'lucide-react';

const BottomNavigation = () => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black pb-safe z-50 h-24 flex items-center justify-center shadow-[0_-4px_0_0_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center w-full max-w-md px-6 gap-4">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all border-4 border-black ${isActive
                            ? 'bg-[#0099FF] text-white shadow-[2px_2px_0px_0px_#000000] translate-x-[-2px] translate-y-[-2px]'
                            : 'bg-white text-black shadow-none hover:bg-gray-100'
                        }`
                    }
                >
                    <BookOpen size={28} strokeWidth={3} />
                </NavLink>

                <NavLink
                    to="/discover"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all border-4 border-black ${isActive
                            ? 'bg-[#FFD700] text-black shadow-[2px_2px_0px_0px_#000000] translate-x-[-2px] translate-y-[-2px]'
                            : 'bg-white text-black shadow-none hover:bg-gray-100'
                        }`
                    }
                >
                    <Compass size={28} strokeWidth={3} />
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all border-4 border-black ${isActive
                            ? 'bg-[#FF6B6B] text-white shadow-[2px_2px_0px_0px_#000000] translate-x-[-2px] translate-y-[-2px]'
                            : 'bg-white text-black shadow-none hover:bg-gray-100'
                        }`
                    }
                >
                    <Settings size={28} strokeWidth={3} />
                </NavLink>
            </div>
        </nav>
    );
};

export default BottomNavigation;
