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

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/homepage.css';

const NiceClawLaunchFloat = () => {
  const { t } = useTranslation();
  const linkRef = useRef(null);
  const frameRef = useRef(null);
  const tagText = t('niceclaw.launch.tag');
  const titleText = t('niceclaw.launch.title');
  const descriptionText = t('niceclaw.launch.description');
  const actionText = t('niceclaw.launch.action');

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const updatePointerOffset = (nextX, nextY) => {
    const node = linkRef.current;
    if (!node) {
      return;
    }

    node.style.setProperty('--niceclaw-hover-x', `${nextX.toFixed(2)}px`);
    node.style.setProperty('--niceclaw-hover-y', `${nextY.toFixed(2)}px`);
  };

  const handleMouseMove = (event) => {
    const node = linkRef.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    const nextX = offsetX * 12;
    const nextY = offsetY * 10;

    node.classList.add('is-hovering');
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(() => {
      updatePointerOffset(nextX, nextY);
    });
  };

  const handleMouseLeave = () => {
    const node = linkRef.current;
    if (!node) {
      return;
    }

    node.classList.remove('is-hovering');
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(() => {
      updatePointerOffset(0, 0);
    });
  };

  return (
    <div className='niceclaw-launch-float'>
      <a
        href='https://claw.nicerouter.com/'
        target='_blank'
        rel='noopener noreferrer'
        className='niceclaw-launch-link'
        aria-label={actionText}
        ref={linkRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className='niceclaw-launch-bubble'>
          <div className='niceclaw-launch-bubble__tag'>{tagText}</div>
          <div className='niceclaw-launch-bubble__title'>{titleText}</div>
          <p className='niceclaw-launch-bubble__description'>{descriptionText}</p>
          <div className='niceclaw-launch-bubble__action'>{actionText}</div>
          <span className='niceclaw-launch-bubble__tail' />
        </div>

        <div className='niceclaw-launch-dock'>
          <span className='niceclaw-launch-dock__edge' />
          <span className='niceclaw-launch-dock__glow' />
          <div className='niceclaw-launch-dock__shell'>
            <img
              src='/niceclaw.svg'
              alt='NiceClaw'
              className='niceclaw-launch-dock__icon'
            />
          </div>
        </div>
      </a>
    </div>
  );
};

export default NiceClawLaunchFloat;
