import { useTranslation } from 'react-i18next';

const SettingsView = () => {
    const { i18n } = useTranslation();
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

            <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-medium text-gray-800 mb-2">Language</h3>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => i18n.changeLanguage('en')} className="text-left px-4 py-2 rounded hover:bg-gray-50 text-sm">🇬🇧 English</button>
                        <button onClick={() => i18n.changeLanguage('es')} className="text-left px-4 py-2 rounded hover:bg-gray-50 text-sm">🇪🇸 Español</button>
                        <button onClick={() => i18n.changeLanguage('fr')} className="text-left px-4 py-2 rounded hover:bg-gray-50 text-sm">🇫🇷 Français</button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-medium text-gray-800">Account</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage your profile and preferences.</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-medium text-gray-800">Notifications</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure your notification settings.</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-medium text-gray-800">About</h3>
                    <p className="text-sm text-gray-500 mt-1">PicoPico v0.1.0</p>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
