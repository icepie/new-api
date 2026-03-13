/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Button, Modal, Empty, Timeline } from '@douyinfe/semi-ui';
import { useActualTheme } from '../../context/Theme';

const SPRING = 'cubic-bezier(0.34,1.56,0.64,1)';
import { useTranslation } from 'react-i18next';
import { API, showError, getRelativeTime } from '../../helpers';
import { marked } from 'marked';
import {
  IllustrationNoContent,
  IllustrationNoContentDark,
} from '@douyinfe/semi-illustrations';
import { StatusContext } from '../../context/Status';
import { Bell, Megaphone, CalendarClock, X } from 'lucide-react';

const NoticeModal = ({
  visible,
  onClose,
  isMobile,
  defaultTab = 'inApp',
  unreadKeys = [],
}) => {
  const { t } = useTranslation();
  const actualTheme = useActualTheme();
  const dark = actualTheme === 'dark';
  const [noticeContent, setNoticeContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [statusState] = useContext(StatusContext);

  const announcements = statusState?.status?.announcements || [];

  const unreadSet = useMemo(() => new Set(unreadKeys), [unreadKeys]);

  const getKeyForItem = (item) =>
    `${item?.publishDate || ''}-${(item?.content || '').slice(0, 30)}`;

  const processedAnnouncements = useMemo(() => {
    return (announcements || []).slice(0, 20).map((item) => {
      const pubDate = item?.publishDate ? new Date(item.publishDate) : null;
      const absoluteTime =
        pubDate && !isNaN(pubDate.getTime())
          ? `${pubDate.getFullYear()}-${String(pubDate.getMonth() + 1).padStart(2, '0')}-${String(pubDate.getDate()).padStart(2, '0')} ${String(pubDate.getHours()).padStart(2, '0')}:${String(pubDate.getMinutes()).padStart(2, '0')}`
          : item?.publishDate || '';
      return {
        key: getKeyForItem(item),
        type: item.type || 'default',
        time: absoluteTime,
        content: item.content,
        extra: item.extra,
        relative: getRelativeTime(item.publishDate),
        isUnread: unreadSet.has(getKeyForItem(item)),
      };
    });
  }, [announcements, unreadSet]);

  const handleCloseTodayNotice = () => {
    const today = new Date().toDateString();
    localStorage.setItem('notice_close_date', today);
    onClose();
  };

  const displayNotice = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/notice');
      const { success, message, data } = res.data;
      if (success) {
        setNoticeContent(data ? marked.parse(data) : '');
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) displayNotice();
  }, [visible]);

  useEffect(() => {
    if (visible) setActiveTab(defaultTab);
  }, [defaultTab, visible]);

  const renderMarkdownNotice = () => {
    if (loading) {
      return (
        <div className='py-12'>
          <Empty description={t('加载中...')} />
        </div>
      );
    }
    if (!noticeContent) {
      return (
        <div className='py-12'>
          <Empty
            image={<IllustrationNoContent style={{ width: 150, height: 150 }} />}
            darkModeImage={<IllustrationNoContentDark style={{ width: 150, height: 150 }} />}
            description={t('暂无公告')}
          />
        </div>
      );
    }
    return (
      <div
        dangerouslySetInnerHTML={{ __html: noticeContent }}
        className='notice-content-scroll max-h-[55vh] overflow-y-auto pr-2'
      />
    );
  };

  const renderAnnouncementTimeline = () => {
    if (processedAnnouncements.length === 0) {
      return (
        <div className='py-12'>
          <Empty
            image={<IllustrationNoContent style={{ width: 150, height: 150 }} />}
            darkModeImage={<IllustrationNoContentDark style={{ width: 150, height: 150 }} />}
            description={t('暂无系统公告')}
          />
        </div>
      );
    }
    return (
      <div className='max-h-[55vh] overflow-y-auto pr-2 card-content-scroll'>
        <Timeline mode='left'>
          {processedAnnouncements.map((item, idx) => {
            const htmlContent = marked.parse(item.content || '');
            const htmlExtra = item.extra ? marked.parse(item.extra) : '';
            return (
              <Timeline.Item
                key={idx}
                type={item.type}
                time={`${item.relative ? item.relative + ' ' : ''}${item.time}`}
                extra={
                  item.extra ? (
                    <div
                      className='text-xs text-gray-500'
                      dangerouslySetInnerHTML={{ __html: htmlExtra }}
                    />
                  ) : null
                }
              >
                <div
                  className={item.isUnread ? 'shine-text' : ''}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </Timeline.Item>
            );
          })}
        </Timeline>
      </div>
    );
  };

  return (
    <Modal
      title={
        <div className='flex items-center gap-3'>
          <span className='font-semibold'>{t('系统公告')}</span>
          <div className='flex gap-1'>
            {[
              { key: 'inApp',  icon: <Bell size={13} />,     label: t('通知') },
              { key: 'system', icon: <Megaphone size={13} />, label: t('系统公告') },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    transition: `background 0.2s ${SPRING}, color 0.15s ${SPRING}, transform 0.15s ${SPRING}`,
                    ...(active
                      ? { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', color: dark ? '#ffffff' : '#111827' }
                      : { color: dark ? '#9ca3af' : '#6b7280' }
                    ),
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs select-none ${active ? 'font-semibold' : 'font-medium hover:bg-black/5 dark:hover:bg-white/8'}`}
                >
                  {tab.icon}{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      }
      visible={visible}
      onCancel={onClose}
      footer={
        <div className='flex items-center justify-between w-full'>
          <button
            onClick={handleCloseTodayNotice}
            className='flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/8 select-none'
          >
            <CalendarClock size={13} />
            {t('今日不再显示')}
          </button>
          <Button theme='borderless' type='tertiary' onClick={onClose}>{t('关闭')}</Button>
        </div>
      }
      size={isMobile ? 'full-width' : 'large'}
    >
      {activeTab === 'inApp' ? renderMarkdownNotice() : renderAnnouncementTimeline()}
    </Modal>
  );
};

export default NoticeModal;
