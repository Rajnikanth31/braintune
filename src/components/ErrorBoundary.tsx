import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  info?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info?.componentStack ?? undefined });
    console.error('Braintune crashed:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, info: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 28,
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 12 }}>🤖</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>
          Oops! Something hiccuped.
        </h2>
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
            marginBottom: 24,
            maxWidth: 340,
          }}
        >
          Don&apos;t worry — tap below to try again. If it keeps happening, please show this
          screen to a grown-up.
        </p>

        <button
          type="button"
          onClick={this.handleReset}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#FFF',
            padding: '14px 40px',
            borderRadius: 18,
            fontSize: 17,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          Try Again 🔄
        </button>

        <div
          style={{
            width: '100%',
            maxWidth: 460,
            backgroundColor: 'var(--card)',
            borderRadius: 14,
            border: '1px solid var(--border)',
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}
          >
            Technical details
          </div>
          <div style={{ fontSize: 13, color: 'var(--secondary)', marginBottom: 8 }}>
            {error?.toString() || 'Unknown error'}
          </div>
          {info ? (
            <pre
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {info.trim()}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
