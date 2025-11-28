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

import React, { useContext, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import ModelShowcase from '../../components/homepage/ModelShowcase';
import QuickStart from '../../components/homepage/QuickStart';
import ApiUrlDisplay from '../../components/homepage/ApiUrlDisplay';
import Typewriter from '../../components/homepage/Typewriter';
import ShuffleText from '../../components/homepage/ShuffleText';
import '../../styles/homepage.css';

const HomeNew = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const containerRef = useRef(null);
  const locale = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const isChinese = i18n.language.startsWith('zh');

  const docsLink = statusState?.status?.docs_link || '';

  // 快速开始步骤
  const quickStartSteps = [
    {
      number: '01',
      title: t('hero.quickStart.step1.title'),
      description: t('hero.quickStart.step1.description'),
      buttonText: t('hero.quickStart.step1.button'),
      buttonLink: '/login',
    },
    {
      number: '02',
      title: t('hero.quickStart.step2.title'),
      description: t('hero.quickStart.step2.description'),
      buttonText: t('hero.quickStart.step2.button'),
      buttonLink: '/console/token',
    },
    {
      number: '03',
      title: t('hero.quickStart.step3.title'),
      description: t('hero.quickStart.step3.description'),
      buttonText: t('hero.quickStart.step3.button'),
      buttonLink: '/pricing',
    },
  ];

  // 初始化 snap-scroll 效果
  useEffect(() => {
    document.documentElement.classList.add('has-snap-scroll');

    const container = containerRef.current;
    if (!container) return;

    // 检测触摸板滚动
    let isTrackpad = false;
    let lastWheelTime = 0;
    let wheelCount = 0;

    const detectTrackpad = (e) => {
      const now = Date.now();
      const timeDelta = now - lastWheelTime;
      lastWheelTime = now;

      if (timeDelta < 50 && Math.abs(e.deltaY) < 10) {
        wheelCount++;
        if (wheelCount > 3) {
          return true;
        }
      } else {
        wheelCount = 0;
      }

      if (e.deltaMode === 0 && Math.abs(e.deltaY) < 5) {
        return true;
      }

      if (e.deltaMode === 1 && Math.abs(e.deltaY) > 50) {
        return false;
      }

      return isTrackpad;
    };

    let isScrolling = false;
    let scrollTimeout = null;
    let accumulatedDelta = 0;
    const scrollThreshold = 120;

    container.addEventListener(
      'wheel',
      (e) => {
        isTrackpad = detectTrackpad(e);

        if (isTrackpad) {
          return;
        }

        if (isScrolling) {
          e.preventDefault();
          return;
        }

        accumulatedDelta += e.deltaY;

        if (Math.abs(accumulatedDelta) >= scrollThreshold) {
          e.preventDefault();

          const currentScrollTop = container.scrollTop;
          const containerHeight = container.clientHeight;
          const direction = accumulatedDelta > 0 ? 1 : -1;

          const targetScroll = currentScrollTop + direction * containerHeight;

          isScrolling = true;
          accumulatedDelta = 0;

          container.scrollTo({
            top: targetScroll,
            behavior: 'smooth',
          });

          if (scrollTimeout) clearTimeout(scrollTimeout);
          scrollTimeout = window.setTimeout(() => {
            isScrolling = false;
          }, 600);
        }
      },
      { passive: false }
    );

    let scrollRafId = null;
    container.addEventListener(
      'scroll',
      () => {
        if (scrollRafId) return;

        scrollRafId = requestAnimationFrame(() => {
          if (scrollTimeout) clearTimeout(scrollTimeout);
          scrollTimeout = window.setTimeout(() => {
            isScrolling = false;
            accumulatedDelta = 0;
          }, 150);
          scrollRafId = null;
        });
      },
      { passive: true }
    );

    // 滚动动画处理
    const animateElements = document.querySelectorAll('.scroll-animate');

    let observerRafId = null;
    let isScrollingForAnimation = false;
    let scrollEndTimer = null;

    container.addEventListener(
      'scroll',
      () => {
        isScrollingForAnimation = true;
        if (scrollEndTimer) clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(() => {
          isScrollingForAnimation = false;
        }, 150);
      },
      { passive: true }
    );

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingForAnimation) {
          if (observerRafId) cancelAnimationFrame(observerRafId);
          observerRafId = requestAnimationFrame(() => {
            setTimeout(() => {
              entries.forEach((entry) => {
                const element = entry.target;
                if (entry.isIntersecting && !element.classList.contains('animate')) {
                  element.classList.add('animate');
                }
              });
            }, 50);
            observerRafId = null;
          });
          return;
        }

        if (observerRafId) cancelAnimationFrame(observerRafId);

        observerRafId = requestAnimationFrame(() => {
          entries.forEach((entry) => {
            const element = entry.target;
            if (entry.isIntersecting && !element.classList.contains('animate')) {
              element.classList.add('animate');
            } else if (!entry.isIntersecting && element.classList.contains('animate')) {
              const rect = element.getBoundingClientRect();
              if (rect.top < -100) {
                element.classList.remove('animate');
              }
            }
          });
          observerRafId = null;
        });
      },
      {
        threshold: 0.25,
        rootMargin: '0px 0px -80px 0px',
      }
    );

    animateElements.forEach((element) => {
      observer.observe(element);
    });

    requestAnimationFrame(() => {
      animateElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          element.classList.add('animate');
        }
      });
    });

    // Glitch Text 特效
    const glitchElements = document.querySelectorAll('.glitch-text');
    const glitchObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target;
          if (entry.isIntersecting && !element.classList.contains('glitch-active')) {
            element.classList.add('glitch-active');
            setTimeout(() => {
              element.classList.remove('glitch-active');
            }, 1200);
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    glitchElements.forEach((element) => {
      glitchObserver.observe(element);
    });

    requestAnimationFrame(() => {
      glitchElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          element.classList.add('glitch-active');
          setTimeout(() => {
            element.classList.remove('glitch-active');
          }, 1200);
        }
      });
    });

    // 核心特性卡片动画
    const featureCards = document.querySelectorAll('.feature-card');
    let featureRafId = null;
    const featureObserver = new IntersectionObserver(
      (entries) => {
        if (isScrollingForAnimation) {
          if (featureRafId) cancelAnimationFrame(featureRafId);
          featureRafId = requestAnimationFrame(() => {
            setTimeout(() => {
              entries.forEach((entry) => {
                const card = entry.target;
                if (entry.isIntersecting && !card.classList.contains('feature-card-visible')) {
                  if (card.classList.contains('feature-card-left')) {
                    card.classList.add('feature-card-visible');
                  } else if (card.classList.contains('feature-card-center')) {
                    setTimeout(() => card.classList.add('feature-card-visible'), 80);
                  } else if (card.classList.contains('feature-card-right')) {
                    setTimeout(() => card.classList.add('feature-card-visible'), 160);
                  }
                }
              });
            }, 50);
            featureRafId = null;
          });
          return;
        }

        if (featureRafId) cancelAnimationFrame(featureRafId);

        featureRafId = requestAnimationFrame(() => {
          entries.forEach((entry) => {
            const card = entry.target;
            if (entry.isIntersecting && !card.classList.contains('feature-card-visible')) {
              if (card.classList.contains('feature-card-left')) {
                setTimeout(() => card.classList.add('feature-card-visible'), 80);
              } else if (card.classList.contains('feature-card-center')) {
                setTimeout(() => card.classList.add('feature-card-visible'), 160);
              } else if (card.classList.contains('feature-card-right')) {
                setTimeout(() => card.classList.add('feature-card-visible'), 240);
              }
            } else if (!entry.isIntersecting && card.classList.contains('feature-card-visible')) {
              const rect = card.getBoundingClientRect();
              if (rect.top < -100) {
                card.classList.remove('feature-card-visible');
              }
            }
          });
          featureRafId = null;
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -60px 0px',
      }
    );

    featureCards.forEach((card) => {
      featureObserver.observe(card);
    });

    return () => {
      document.documentElement.classList.remove('has-snap-scroll');
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
      if (observerRafId) cancelAnimationFrame(observerRafId);
      if (featureRafId) cancelAnimationFrame(featureRafId);
      observer.disconnect();
      glitchObserver.disconnect();
      featureObserver.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen snap-scroll-container overflow-x-hidden relative" ref={containerRef}>
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen snap-section flex items-center justify-center">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-20 xl:px-24 pt-16 sm:pt-20 md:pt-24 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-5 leading-tight hero-title-shine">
              {t('hero.title')}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <div className="max-w-2xl mx-auto mb-6 text-left">
              <ApiUrlDisplay locale={locale} />
            </div>
            <div className="hero-buttons">
              <Link
                to="/login"
                className="hero-button-primary"
              >
                {t('hero.cta')}
                <svg className="hero-button-primary-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              {docsLink && (
                <a
                  href={docsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-button-secondary"
                >
                  {t('hero.nav.api')}
                </a>
              )}
            </div>
            {/* Stats Section */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16">
              <div className="stats-box rounded-xl border border-dashed border-purple-200 dark:border-purple-400/40 px-4 sm:px-5 py-3 sm:py-3.5 bg-white dark:bg-gray-900">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-1.5">
                  30+
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('hero.stats.models')}
                </div>
              </div>
              <div className="stats-box rounded-xl border border-dashed border-purple-200 dark:border-purple-400/40 px-4 sm:px-5 py-3 sm:py-3.5 bg-white dark:bg-gray-900">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-1.5">
                  99.9%
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('hero.stats.availability')}
                </div>
              </div>
              <div className="stats-box rounded-xl border border-dashed border-purple-200 dark:border-purple-400/40 px-4 sm:px-5 py-3 sm:py-3.5 bg-white dark:bg-gray-900">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-1.5">
                  7
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('hero.stats.nodes')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Models Showcase Section */}
      <section className="relative min-h-screen snap-section flex items-center justify-center overflow-x-hidden">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-20 xl:px-24 pt-16 sm:pt-20 md:pt-24 scroll-animate overflow-x-hidden relative z-10">
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <div className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
              {t('hero.partnersLabel')}
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight">
              <Typewriter text={t('hero.modelsTitle')} speed={150} />
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              {t('hero.subtext')}
            </p>
          </div>
          <ModelShowcase />
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="relative min-h-screen snap-section flex items-center justify-center">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-20 xl:px-24 pt-16 sm:pt-20 md:pt-24 relative z-10 scroll-animate">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <div className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
              {t('hero.quickStart.label')}
            </div>
            <h2
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight glitch-text"
              data-text={t('hero.quickStart.title')}
            >
              {t('hero.quickStart.title')}
            </h2>
          </div>
          <QuickStart steps={quickStartSteps} />
        </div>
      </section>

      {/* Features Section */}
      <section className="min-h-screen snap-section flex items-center justify-center">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-20 xl:px-24 pt-16 sm:pt-20 md:pt-24 scroll-animate">
          <div className="text-left mb-8 sm:mb-12 md:mb-16">
            <div className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
              {t('hero.features.label')}
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight">
              <ShuffleText text={t('hero.features.title')} speed={35} shuffleDuration={90} />
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
              {t('hero.features.description')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
            <div className="feature-card feature-card-left">
              <div className="feature-card-icon-wrapper feature-card-icon-blue">
                <svg
                  className="feature-card-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="feature-card-title">
                {t('hero.features.unified.title')}
              </h3>
              <p className="feature-card-description">
                {t('hero.features.unified.desc')}
              </p>
            </div>

            <div className="feature-card feature-card-center">
              <div className="feature-card-icon-wrapper feature-card-icon-purple">
                <svg
                  className="feature-card-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="feature-card-title">
                {t('hero.features.observable.title')}
              </h3>
              <p className="feature-card-description">
                {t('hero.features.observable.desc')}
              </p>
            </div>

            <div className="feature-card feature-card-right">
              <div className="feature-card-icon-wrapper feature-card-icon-pink">
                <svg
                  className="feature-card-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              </div>
              <h3 className="feature-card-title">
                {t('hero.features.scalable.title')}
              </h3>
              <p className="feature-card-description">
                {t('hero.features.scalable.desc')}
              </p>
            </div>

            <div className="feature-card feature-card-right">
              <div className="feature-card-icon-wrapper feature-card-icon-indigo">
                <svg
                  className="feature-card-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="feature-card-title">
                {t('hero.features.developer.title')}
              </h3>
              <p className="feature-card-description">
                {t('hero.features.developer.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="snap-section homepage-footer">
        <div className="homepage-footer-content">
          <div className="homepage-footer-copyright">
            <span className="homepage-footer-copyright-text">
              © 2025 <span className="italic">NiceRouter</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeNew;

