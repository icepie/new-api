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

import { useEffect, useState, useRef } from 'react';
import { useActualTheme } from '../../context/Theme';

/**
 * 背景渐变和光斑动画组件
 */
const sectionThemes = [
  {
    hue1: 200,
    hue2: 240,
    saturation: 70,
    lightness: 75,
    blobColors: ['blue', 'purple'],
    blobPositions: [
      { x: 20, y: 30 },
      { x: 80, y: 70 },
    ],
  },
  {
    hue1: 260,
    hue2: 280,
    saturation: 65,
    lightness: 72,
    blobColors: ['purple', 'pink'],
    blobPositions: [
      { x: 30, y: 20 },
      { x: 70, y: 80 },
      { x: 50, y: 50 },
    ],
  },
  {
    hue1: 180,
    hue2: 200,
    saturation: 65,
    lightness: 73,
    blobColors: ['blue', 'cyan'],
    blobPositions: [
      { x: 15, y: 60 },
      { x: 85, y: 40 },
      { x: 50, y: 25 },
    ],
  },
  {
    hue1: 300,
    hue2: 320,
    saturation: 75,
    lightness: 75,
    blobColors: ['pink', 'purple'],
    blobPositions: [
      { x: 25, y: 45 },
      { x: 75, y: 55 },
      { x: 50, y: 75 },
    ],
  },
  {
    hue1: 220,
    hue2: 250,
    saturation: 60,
    lightness: 70,
    blobColors: ['blue', 'indigo'],
    blobPositions: [
      { x: 40, y: 50 },
      { x: 60, y: 50 },
    ],
  },
];

const easeInOutSine = (t) => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

export default function HeroBackground() {
  const actualTheme = useActualTheme();
  const isDark = actualTheme === 'dark';
  const [blobs, setBlobs] = useState([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionProgress, setSectionProgress] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef(null);
  const sectionsRef = useRef([]);
  const rafId = useRef(null);
  const blobStateRef = useRef([]);
  const previousSectionRef = useRef(0);
  const lastUpdateTime = useRef(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 初始化光斑
  useEffect(() => {
    if (!isMounted) return;

    const theme = sectionThemes[0];
    const blobCount = Math.max(theme.blobPositions.length, 4);

    const initialBlobs = Array.from({ length: blobCount }, (_, i) => {
      const pos = theme.blobPositions[i] || {
        x: 20 + (i * 30) % 80,
        y: 20 + Math.floor(i / 3) * 40,
      };
      return {
        id: i,
        x: pos.x,
        y: pos.y,
        size: 120 + Math.random() * 80,
        color: theme.blobColors[i % theme.blobColors.length],
        opacity: 0.3 + Math.random() * 0.2,
        speed: 0.2 + Math.random() * 0.3,
      };
    });

    setBlobs(initialBlobs);
    blobStateRef.current = initialBlobs;
    lastUpdateTime.current = Date.now();
  }, [isMounted]);

  // 更新section进度和光斑动画
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || typeof document === 'undefined') return;

    const findContainer = () => {
      // 优先查找 snap-scroll-container
      const container = document.querySelector('.snap-scroll-container');
      if (container) return container;
      // 如果找不到，返回 null，让 updateSectionProgress 继续尝试
      return null;
    };

    const findSections = () => {
      return Array.from(document.querySelectorAll('.snap-section'));
    };

    // 初始化查找
    containerRef.current = findContainer();
    sectionsRef.current = findSections();

    const lerp = (start, end, factor) => {
      return start + (end - start) * factor;
    };

    const updateBlobs = (currentSectionIndex, progress, forceUpdate = false) => {
      if (blobStateRef.current.length === 0) return;

      const currentTheme = sectionThemes[currentSectionIndex] || sectionThemes[0];
      const nextSectionIndex = Math.min(currentSectionIndex + 1, sectionThemes.length - 1);
      const nextTheme = sectionThemes[nextSectionIndex] || sectionThemes[0];

      const transitionStart = 0.5;
      const isTransitioning = progress > transitionStart && currentSectionIndex < sectionThemes.length - 1;
      const transitionProgress = isTransitioning
        ? easeInOutSine((progress - transitionStart) / (1 - transitionStart))
        : 0;

      const now = Date.now();
      lastUpdateTime.current = now;
      const time = now / 5000;

      const updatedBlobs = blobStateRef.current.map((blob, index) => {
        const posIndex = index % currentTheme.blobPositions.length;
        const targetPos = currentTheme.blobPositions[posIndex];
        const nextPosIndex = index % nextTheme.blobPositions.length;
        const nextPos = nextTheme.blobPositions[nextPosIndex];

        const targetX = isTransitioning ? lerp(targetPos.x, nextPos.x, transitionProgress) : targetPos.x;
        const targetY = isTransitioning ? lerp(targetPos.y, nextPos.y, transitionProgress) : targetPos.y;

        const phase = (index / blobStateRef.current.length) * Math.PI * 2;
        const floatSpeed = 0.1 + blob.speed * 0.05;
        const xOffset = Math.sin(phase + time * floatSpeed) * 1.5;
        const yOffset = Math.cos(phase + time * floatSpeed * 0.7) * 1.5;

        const breathingSpeed = 0.15;
        const sizePhase = phase + time * breathingSpeed;
        const sizeVariation = Math.sin(sizePhase) * 15 + Math.sin(sizePhase * 2) * 5;

        const opacityBase = isDark ? 0.5 + progress * 0.2 : 0.35 + progress * 0.15;
        const opacityVariation = Math.sin(phase + time * 0.3) * 0.05;
        const finalOpacity = isDark
          ? Math.max(0.4, Math.min(0.75, opacityBase + opacityVariation))
          : Math.max(0.25, Math.min(0.6, opacityBase + opacityVariation));

        if (forceUpdate) {
          return {
            ...blob,
            x: Math.max(0, Math.min(100, targetX + xOffset)),
            y: Math.max(0, Math.min(100, targetY + yOffset)),
            size: Math.max(100, Math.min(250, blob.size + sizeVariation * blob.speed)),
            opacity: finalOpacity,
          };
        }

        const distanceX = Math.abs(targetX - blob.x);
        const distanceY = Math.abs(targetY - blob.y);
        const maxDistance = Math.max(distanceX, distanceY);

        const baseLerpFactor = 0.08 + blob.speed * 0.1;
        const lerpFactor = maxDistance > 20 ? Math.min(0.3, baseLerpFactor * 2) : baseLerpFactor;

        const currentX = lerp(blob.x, targetX, lerpFactor);
        const currentY = lerp(blob.y, targetY, lerpFactor);

        return {
          ...blob,
          x: Math.max(0, Math.min(100, currentX + xOffset)),
          y: Math.max(0, Math.min(100, currentY + yOffset)),
          size: Math.max(100, Math.min(250, blob.size + sizeVariation * blob.speed)),
          opacity: finalOpacity,
        };
      });

      blobStateRef.current = updatedBlobs;
      setBlobs([...updatedBlobs]);
    };

    const updateSectionProgress = () => {
      // 重新查找容器和 sections（因为 DOM 可能还没准备好）
      if (!containerRef.current) {
        containerRef.current = findContainer();
      }
      
      if (!containerRef.current) {
        rafId.current = requestAnimationFrame(updateSectionProgress);
        return;
      }

      // 重新查找 sections（因为可能动态添加）
      if (sectionsRef.current.length === 0) {
        sectionsRef.current = findSections();
      }
      
      if (sectionsRef.current.length === 0) {
        rafId.current = requestAnimationFrame(updateSectionProgress);
        return;
      }

      const container = containerRef.current;
      const sections = sectionsRef.current;
      
      // 获取滚动位置 - 对于 snap-scroll-container，使用 scrollTop
      // 对于 window，使用 window.scrollY
      let scrollTop = 0;
      let viewportHeight = 0;
      
      if (container === document.body || container === document.documentElement) {
        scrollTop = window.scrollY || window.pageYOffset || 0;
        viewportHeight = window.innerHeight;
      } else {
        scrollTop = container.scrollTop || 0;
        viewportHeight = container.clientHeight || window.innerHeight;
      }
      
      const viewportCenter = scrollTop + viewportHeight / 2;

      let activeSectionIndex = 0;
      let transitionRatio = 0;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section) continue;

        // 计算 section 相对于容器的位置
        let sectionTop = 0;
        if (container === document.body || container === document.documentElement) {
          const rect = section.getBoundingClientRect();
          sectionTop = rect.top + scrollTop;
        } else {
          // 对于 snap-scroll-container，section.offsetTop 是相对于容器的
          sectionTop = section.offsetTop || 0;
        }
        
        const sectionHeight = Math.max(1, section.offsetHeight || viewportHeight);
        const sectionBottom = sectionTop + sectionHeight;

        if (viewportCenter >= sectionTop && viewportCenter < sectionBottom) {
          activeSectionIndex = i;
          const sectionScroll = Math.max(0, viewportCenter - sectionTop);
          transitionRatio = Math.max(0, Math.min(1, sectionScroll / sectionHeight));
          break;
        } else if (viewportCenter < sectionTop && i === 0) {
          activeSectionIndex = 0;
          transitionRatio = 0;
          break;
        } else if (i === sections.length - 1 && viewportCenter >= sectionBottom) {
          activeSectionIndex = sections.length - 1;
          transitionRatio = 1;
          break;
        }
      }

      const safeIndex = Math.max(0, Math.min(activeSectionIndex, sections.length - 1, sectionThemes.length - 1));
      const safeProgress = Math.max(0, Math.min(1, transitionRatio));

      const sectionChanged = safeIndex !== previousSectionRef.current;

      setCurrentSection(safeIndex);
      setSectionProgress(safeProgress);

      updateBlobs(safeIndex, safeProgress, sectionChanged);

      if (sectionChanged) {
        previousSectionRef.current = safeIndex;
      }

      rafId.current = requestAnimationFrame(updateSectionProgress);
    };

    rafId.current = requestAnimationFrame(updateSectionProgress);

    const handleResize = () => {
      sectionsRef.current = findSections();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isMounted, isDark]);

  const getGradientStyle = () => {
    const defaultTheme = sectionThemes[0];
    const safeSectionIndex = Math.max(0, Math.min(currentSection, sectionThemes.length - 1));
    const currentTheme = sectionThemes[safeSectionIndex] || defaultTheme;
    const nextSectionIndex = Math.min(safeSectionIndex + 1, sectionThemes.length - 1);
    const nextTheme = sectionThemes[nextSectionIndex] || defaultTheme;

    const transitionStart = 0.5;
    const safeProgress = Math.max(0, Math.min(1, sectionProgress));
    const isTransitioning = safeProgress > transitionStart && safeSectionIndex < sectionThemes.length - 1;
    const transitionProgress = isTransitioning
      ? easeInOutSine((safeProgress - transitionStart) / (1 - transitionStart))
      : 0;

    const hue1 = Math.max(0, Math.min(360, currentTheme.hue1 + (nextTheme.hue1 - currentTheme.hue1) * transitionProgress));
    const hue2 = Math.max(0, Math.min(360, currentTheme.hue2 + (nextTheme.hue2 - currentTheme.hue2) * transitionProgress));
    const saturation = Math.max(40, Math.min(100, currentTheme.saturation + (nextTheme.saturation - currentTheme.saturation) * transitionProgress));
    const lightness = Math.max(70, Math.min(95, currentTheme.lightness + (nextTheme.lightness - currentTheme.lightness) * transitionProgress));

    if (isDark) {
      const darkSaturation = Math.max(30, Math.min(100, saturation * 0.8));
      const darkLightness = Math.max(25, Math.min(65, lightness * 0.45));

      return {
        background: `linear-gradient(to br, 
          hsl(${hue1}, ${darkSaturation}%, ${darkLightness}%) 0%, 
          hsl(${hue1 + 15}, ${Math.max(20, darkSaturation - 8)}%, ${darkLightness + 5}%) 50%, 
          hsl(${hue2}, ${darkSaturation}%, ${darkLightness}%) 100%
        )`,
        opacity: 1.0,
        visibility: 'visible',
      };
    } else {
      return {
        background: `linear-gradient(to br, 
          hsl(${hue1}, ${saturation}%, ${lightness}%) 0%, 
          hsl(${hue1 + 20}, ${Math.max(30, saturation - 10)}%, ${Math.min(95, lightness + 8)}%) 50%, 
          hsl(${hue2}, ${saturation}%, ${lightness}%) 100%
        )`,
        opacity: 1.0,
        visibility: 'visible',
      };
    }
  };

  if (!isMounted) {
    return null;
  }

  const gradientStyle = getGradientStyle();
  const colorMap = {
    blue: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(96, 165, 250, 0.5)',
    purple: isDark ? 'rgba(147, 51, 234, 0.6)' : 'rgba(168, 85, 247, 0.5)',
    pink: isDark ? 'rgba(236, 72, 153, 0.6)' : 'rgba(244, 114, 182, 0.5)',
    cyan: isDark ? 'rgba(34, 211, 238, 0.6)' : 'rgba(56, 189, 248, 0.5)',
    indigo: isDark ? 'rgba(99, 102, 241, 0.6)' : 'rgba(129, 140, 248, 0.5)',
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        position: 'fixed',
        top: '0px',
        left: '0px',
        right: '0px',
        bottom: '0px',
        width: '100vw',
        height: '100vh',
        zIndex: 0,
      }}
      suppressHydrationWarning
    >
      {/* 背景渐变 */}
      <div
        style={{
          position: 'absolute',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          width: '100%',
          height: '100%',
          ...gradientStyle,
          zIndex: 0,
          pointerEvents: 'none',
          willChange: 'background, opacity',
          display: 'block',
          visibility: 'visible',
        }}
      />

      {/* 光斑 */}
      <div
        style={{
          position: 'absolute',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      >
        {blobs.map((blob) => (
          <div
            key={blob.id}
            className="absolute rounded-full blur-3xl"
            style={{
              left: `${blob.x}%`,
              top: `${blob.y}%`,
              width: `${blob.size}px`,
              height: `${blob.size}px`,
              backgroundColor: colorMap[blob.color],
              opacity: blob.opacity,
              transform: `translate(-50%, -50%) scale(${1 + Math.sin(sectionProgress * Math.PI) * 0.2})`,
              filter: `blur(${50 + Math.sin(sectionProgress * Math.PI * 2) * 15}px)`,
              willChange: 'transform, opacity, filter',
            }}
          />
        ))}
      </div>
    </div>
  );
}

