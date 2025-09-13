import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: String(error?.message || error) };
  }
  componentDidCatch(error, info) {
    console.error("Erro capturado:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Ocorreu um erro na interface</h2>
          <p style={{ color: "#b91c1c" }}>{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
