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

import { Link } from 'react-router-dom';

/**
 * 快速开始步骤组件 - 纯CSS动画实现
 */
export default function QuickStart({ steps = [] }) {
  return (
    <div className="quick-start-container">
      <div className="quick-start-wrapper">
        {steps.map((step, index) => {
          const isExternalLink = step.buttonLink?.startsWith('http');
          const ButtonComponent = isExternalLink ? 'a' : Link;
          const buttonProps = isExternalLink
            ? { href: step.buttonLink, target: '_blank', rel: 'noopener noreferrer' }
            : { to: step.buttonLink || '#' };

          return (
            <div
              key={index}
              className="quick-start-item quick-start-card-fade-in"
            >
              {/* Card */}
              <div className="quick-start-card">
                {/* Pink accent in corner */}
                <div className="quick-start-accent"></div>

                {/* Step Number and Title */}
                <div className="quick-start-header">
                  <div className="quick-start-number">
                    {step.number}
                  </div>
                  <h3 className="quick-start-title">
                    {step.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="quick-start-description">
                  {step.description}
                </p>

                {/* Button */}
                {step.buttonText && (
                  <ButtonComponent
                    {...buttonProps}
                    className="quick-start-button"
                  >
                    <span>{step.buttonText}</span>
                    <svg
                      className="quick-start-button-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </ButtonComponent>
                )}
              </div>

              {/* Arrow between cards */}
              {index < steps.length - 1 && (
                <>
                  {/* Mobile: Down arrow */}
                  <div className="quick-start-arrow-mobile">
                    <svg
                      width="16"
                      height="32"
                      viewBox="0 0 16 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="quick-start-arrow-svg"
                    >
                      <path
                        d="M8 0 L8 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M4 20 L8 24 L12 20"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                  {/* Desktop: Right arrow */}
                  <div className="quick-start-arrow-desktop">
                    <svg
                      width="48"
                      height="16"
                      viewBox="0 0 48 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="quick-start-arrow-svg"
                    >
                      <path
                        d="M0 8 L40 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M36 4 L40 8 L36 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

