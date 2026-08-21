import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  WalletCards,
  X,
  TrendingUp,
  Receipt,
  PieChart,
  Sparkles,
} from "lucide-react";

import "./Welcome.css";

function Welcome() {
  const navigate = useNavigate();

  const finishWelcome = () => {
    localStorage.setItem("ledgerflow_welcome_seen", "true");

    navigate("/dashboard", {
      replace: true,
    });
  };

  return (
    <div className="welcome-page">

      {/* =====================================================
          ANIMATED BACKGROUND
      ===================================================== */}

      <div className="welcome-orb welcome-orb-one" />
      <div className="welcome-orb welcome-orb-two" />
      <div className="welcome-orb welcome-orb-three" />

      <div className="welcome-grid" />

      {/* Floating finance elements */}

      <div className="welcome-floating welcome-floating-one">
        <TrendingUp />
      </div>

      <div className="welcome-floating welcome-floating-two">
        <BarChart3 />
      </div>

      <div className="welcome-floating welcome-floating-three">
        <PieChart />
      </div>

      <div className="welcome-floating welcome-floating-four">
        <Receipt />
      </div>


      {/* =====================================================
          MAIN CARD
      ===================================================== */}

      <main className="welcome-card">

        {/* Animated border */}

        <div className="welcome-card-glow" />


        {/* =================================================
            CLOSE
        ================================================= */}

        <button
          type="button"
          className="welcome-close"
          onClick={finishWelcome}
          aria-label="Close welcome screen"
        >
          <X size={18} />
        </button>


        {/* =================================================
            LOGO
        ================================================= */}

        <div className="welcome-logo-wrapper">

          <div className="welcome-logo-ring" />

          <div className="welcome-logo">
            LF
          </div>

        </div>


        {/* =================================================
            BADGE
        ================================================= */}

        <div className="welcome-badge">

          <span className="welcome-status-dot" />

          <Sparkles size={13} />

          <span>
            Welcome to LedgerFlow AI
          </span>

        </div>


        {/* =================================================
            TITLE
        ================================================= */}

        <h1 className="welcome-title">

          Your smarter

          <span>
            bookkeeping workspace.
          </span>

        </h1>


        {/* =================================================
            DESCRIPTION
        ================================================= */}

        <p className="welcome-description">

          LedgerFlow AI brings your transactions, accounts,
          expenses, budgets, reports and financial insights
          together in one intelligent bookkeeping workspace.

        </p>


        {/* =================================================
            FEATURES
        ================================================= */}

        <div className="welcome-features">


          {/* Feature 1 */}

          <div className="welcome-feature">

            <div className="welcome-feature-number">
              01
            </div>

            <div className="welcome-feature-icon blue">
              <WalletCards size={21} />
            </div>

            <div className="welcome-feature-content">

              <strong>
                Manage your finances
              </strong>

              <span>
                Organize accounts, transactions,
                expenses and categories.
              </span>

            </div>

          </div>


          {/* Feature 2 */}

          <div className="welcome-feature">

            <div className="welcome-feature-number">
              02
            </div>

            <div className="welcome-feature-icon purple">
              <BarChart3 size={21} />
            </div>

            <div className="welcome-feature-content">

              <strong>
                Understand your numbers
              </strong>

              <span>
                Track budgets, reports, analytics
                and financial performance.
              </span>

            </div>

          </div>


          {/* Feature 3 */}

          <div className="welcome-feature">

            <div className="welcome-feature-number">
              03
            </div>

            <div className="welcome-feature-icon green">
              <Brain size={21} />
            </div>

            <div className="welcome-feature-content">

              <strong>
                Get intelligent insights
              </strong>

              <span>
                Discover useful patterns and
                suggestions from your financial data.
              </span>

            </div>

          </div>

        </div>


        {/* =================================================
            CHECKLIST
        ================================================= */}

        <div className="welcome-checklist">

          <div>
            <CheckCircle2 size={16} />
            <span>
              Set up your workspace
            </span>
          </div>

          <div>
            <CheckCircle2 size={16} />
            <span>
              Add your first transaction
            </span>
          </div>

          <div>
            <CheckCircle2 size={16} />
            <span>
              Explore your dashboard
            </span>
          </div>

        </div>


        {/* =================================================
            CTA
        ================================================= */}

        <button
          type="button"
          className="welcome-start-button"
          onClick={finishWelcome}
        >

          <span>
            Get Started
          </span>

          <ArrowRight size={18} />

          <div className="welcome-button-shine" />

        </button>


        {/* =================================================
            FOOTER NOTE
        ================================================= */}

        <p className="welcome-note">

          Your complete guide is always available from the
          sidebar whenever you need help.

        </p>

      </main>

    </div>
  );
}

export default Welcome;