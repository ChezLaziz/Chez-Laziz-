import { Component, type ErrorInfo, type ReactNode } from 'react'
import { trackException } from '@/lib/analytics'

/** Filet de sécurité pour toute erreur React non prévue. Sans ça, un bug dans
 * n'importe quel composant fait disparaître toute la page (écran blanc),
 * sans message ni moyen de s'en sortir pour le visiteur — et sans que
 * personne ne le sache jamais côté propriétaire du site. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    trackException(error.message.slice(0, 150))
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // Composant autonome — ne dépend d'aucun autre composant du site
    // (Header, Footer…) qui pourrait être la cause du plantage.
    const isAr = window.location.pathname === '/ar' || window.location.pathname.startsWith('/ar/')
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
          background: '#faf6f3',
          color: '#2e2a27',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          {isAr ? 'صار خطأ غير متوقع' : "Une erreur inattendue s'est produite"}
        </p>
        <p style={{ maxWidth: '28rem', color: '#756a61', marginBottom: '1.5rem' }}>
          {isAr
            ? 'حاول تحديث الصفحة. إذا استمرت المشكلة، اتصل بينا.'
            : "Essayez d'actualiser la page. Si le problème persiste, contactez-nous."}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#b8912e',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '0.75rem 1.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            {isAr ? 'تحديث الصفحة' : 'Actualiser la page'}
          </button>
          <a
            href={isAr ? '/ar' : '/'}
            style={{
              border: '1px solid rgba(46,42,39,0.25)',
              borderRadius: '999px',
              padding: '0.75rem 1.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#2e2a27',
              textDecoration: 'none',
            }}
          >
            {isAr ? 'العودة إلى الرئيسية' : "Retour à l'accueil"}
          </a>
        </div>
        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#756a61' }}>
          {isAr ? 'لديكم سؤال؟ ' : 'Une question ? '}
          <a href="tel:+21623691039" dir="ltr" style={{ color: '#b8912e', textDecoration: 'underline' }}>
            +216 23 691 039
          </a>
        </p>
      </div>
    )
  }
}
