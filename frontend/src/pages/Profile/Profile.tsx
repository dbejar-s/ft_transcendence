import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import UserInfo from '../../components/UserInfo'; 

export default function Profil() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'user' | 'friends' | 'matches' | 'stats'>('user');

  // TODO: CHANGE
  const user = {
    avatar: '../../assets/Profile/men1.png',
    username: 'JohnDoe',
    email: 'john@example.com',
    language: 'en',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#44433e] text-[#FFFACD] p-4">
      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-[#FFFACD]">
        <button
          className={`py-2 px-4 font-vt323 text-xl ${
            activeTab === 'user' ? 'border-b-4 border-[#FFFACD]' : 'opacity-60'
          }`}
          onClick={() => setActiveTab('user')}
        >
          {user.username}
        </button>
        <button
          className={`py-2 px-4 font-vt323 text-xl ${
            activeTab === 'friends' ? 'border-b-4 border-[#FFFACD]' : 'opacity-60'
          }`}
          onClick={() => setActiveTab('friends')}
        >
          {t('friends')}
        </button>
        <button
          className={`py-2 px-4 font-vt323 text-xl ${
            activeTab === 'matches' ? 'border-b-4 border-[#FFFACD]' : 'opacity-60'
          }`}
          onClick={() => setActiveTab('matches')}
        >
          {t('matchHistory')}
        </button>
        <button
          className={`py-2 px-4 font-vt323 text-xl ${
            activeTab === 'stats' ? 'border-b-4 border-[#FFFACD]' : 'opacity-60'
          }`}
          onClick={() => setActiveTab('stats')}
        >
          {t('statistics')}
        </button>
      </div>

      {/* Content */}
      <div className="bg-[#3b3a37] rounded-xl p-6 shadow-lg">
        {activeTab === 'user' && <UserInfo {...user} />}
        {activeTab === 'friends' && <div>{t('friends')} list</div>}
        {activeTab === 'matches' && <div>{t('matchHistory')} content</div>}
        {activeTab === 'stats' && <div>{t('statistics')} content</div>}
      </div>
    </div>
  );
}
