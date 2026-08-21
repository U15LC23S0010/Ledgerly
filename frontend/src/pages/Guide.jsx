import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  Wallet,
  PiggyBank,
  Tags,
  Users,
  Truck,
  FileText,
  ScanLine,
  BarChart3,
  Sparkles,
  FileBarChart,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  BookOpen,
  PlayCircle,
  Lightbulb,
} from "lucide-react";

import "./Guide.css";

const features = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    color: "blue",

    what: "See your financial information in one place.",

    why: "The Dashboard gives you a quick view of your money without checking every page.",

    how: [
      "Open Dashboard from the sidebar.",
      "Check your income and expenses.",
      "Review your account balances.",
      "Look at your financial health.",
    ],

    useful: "Use it every day to quickly understand your current financial situation.",

    tip: "Start your day with the Dashboard to know where your money is going.",
  },

  {
    id: "transactions",
    title: "Transactions",
    icon: ArrowLeftRight,
    color: "purple",

    what: "Record and manage your money movements.",

    why: "Transactions help you keep a proper record of money coming in and going out.",

    how: [
      "Open Transactions.",
      "Click Add Transaction.",
      "Choose income or expense.",
      "Enter the amount and details.",
      "Save the transaction.",
    ],

    useful: "A complete transaction history makes your bookkeeping organized and easy to check.",

    tip: "Add transactions regularly instead of waiting until the end of the month.",
  },

  {
    id: "expenses",
    title: "Expenses",
    icon: Receipt,
    color: "red",

    what: "Track everything you spend.",

    why: "Expense tracking helps you understand where your money is being used.",

    how: [
      "Open Expenses.",
      "Add a new expense.",
      "Enter the amount.",
      "Choose a category.",
      "Add useful details and save.",
    ],

    useful: "You can identify unnecessary spending and control your expenses.",

    tip: "Always choose the correct category so your reports remain accurate.",
  },

  {
    id: "accounts",
    title: "Accounts",
    icon: Wallet,
    color: "green",

    what: "Manage your bank, cash and other financial accounts.",

    why: "Accounts help you know where your money is stored.",

    how: [
      "Open Accounts.",
      "Add your account.",
      "Enter the account name and details.",
      "Update the balance when required.",
      "Review all your accounts in one place.",
    ],

    useful: "It becomes easier to understand your total available money.",

    tip: "Keep account information updated for better financial tracking.",
  },

  {
    id: "budget",
    title: "Budget",
    icon: PiggyBank,
    color: "orange",

    what: "Plan how much money you want to spend.",

    why: "A budget helps you avoid spending more than you planned.",

    how: [
      "Open Budget.",
      "Create a budget.",
      "Choose a category.",
      "Set your spending limit.",
      "Track how much of the budget you have used.",
    ],

    useful: "Budgeting helps you control spending and save more money.",

    tip: "Set realistic limits instead of extremely low limits that are difficult to maintain.",
  },

  {
    id: "categories",
    title: "Categories",
    icon: Tags,
    color: "pink",

    what: "Organize expenses into useful groups.",

    why: "Categories make your spending easier to understand.",

    how: [
      "Open Categories.",
      "Create a category if needed.",
      "Give it a clear name.",
      "Use the category when recording expenses.",
    ],

    useful: "Categories help Analytics and Reports show where your money is going.",

    tip: "Keep categories simple. For example: Food, Bills, Transport and Health.",
  },

  {
    id: "customers",
    title: "Customers",
    icon: Users,
    color: "cyan",

    what: "Store and manage your customer information.",

    why: "Keeping customer information in one place makes business bookkeeping easier.",

    how: [
      "Open Customers.",
      "Add a customer.",
      "Enter their basic information.",
      "Save the customer.",
      "Use the customer information when needed.",
    ],

    useful: "You can quickly find customer information when creating invoices or managing business records.",

    tip: "Use complete and accurate customer details.",
  },

  {
    id: "vendors",
    title: "Vendors",
    icon: Truck,
    color: "indigo",

    what: "Manage the businesses or people you purchase from.",

    why: "Vendor records help you keep track of suppliers and business purchases.",

    how: [
      "Open Vendors.",
      "Add a vendor.",
      "Enter vendor information.",
      "Save the record.",
      "Use vendors when recording related expenses.",
    ],

    useful: "It becomes easier to understand who you purchase from and manage business expenses.",

    tip: "Keep vendor names consistent so your records stay clean.",
  },

  {
    id: "invoices",
    title: "Invoices",
    icon: FileText,
    color: "violet",

    what: "Create and manage invoices for customers.",

    why: "Invoices help you clearly record what customers need to pay.",

    how: [
      "Open Invoices.",
      "Create a new invoice.",
      "Select the customer.",
      "Add items or services.",
      "Check the total.",
      "Save the invoice.",
    ],

    useful: "Invoices make customer billing more organized and professional.",

    tip: "Always check customer details and invoice amounts before saving.",
  },

  {
    id: "auto-expense",
    title: "Auto Expense",
    icon: ScanLine,
    color: "teal",

    what: "Make expense recording faster using automatic expense processing.",

    why: "Instead of manually entering every detail, Auto Expense can help reduce repetitive work.",

    how: [
      "Open Auto Expense.",
      "Provide the required expense information.",
      "Review the detected details.",
      "Check the amount and category.",
      "Confirm the expense.",
    ],

    useful: "It saves time when you have many expenses to record.",

    tip: "Always review automatically detected information before confirming it.",
  },

  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    color: "blue",

    what: "Understand your spending using charts and numbers.",

    why: "Analytics turns your expense data into easy-to-understand information.",

    how: [
      "Open Analytics.",
      "Review total expenses.",
      "Check your top categories.",
      "Look at spending distribution.",
      "Review average and highest expenses.",
    ],

    useful: "Analytics helps you identify spending patterns and areas where you can save.",

    tip: "Check Analytics regularly instead of only at the end of the year.",
  },

  {
    id: "insights",
    title: "AI Insights",
    icon: Sparkles,
    color: "purple",

    what: "Get simple insights about your financial activity.",

    why: "AI Insights can help you understand important patterns in your financial data.",

    how: [
      "Open AI Insights.",
      "Review the generated insights.",
      "Read warnings carefully.",
      "Check the recommendations.",
      "Use the suggestions to improve your spending habits.",
    ],

    useful: "It can highlight areas that deserve your attention without requiring you to analyze everything manually.",

    tip: "Treat AI recommendations as guidance and always use your own judgment.",
  },

  {
    id: "reports",
    title: "Reports",
    icon: FileBarChart,
    color: "green",

    what: "View useful financial reports from your records.",

    why: "Reports give you a structured view of your financial activity.",

    how: [
      "Open Reports.",
      "Choose the report you need.",
      "Review the information.",
      "Use the report to understand your financial activity.",
    ],

    useful: "Reports are useful for reviewing financial performance and keeping records organized.",

    tip: "Use reports regularly to find changes in your income and expenses.",
  },

  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    color: "orange",

    what: "See important alerts and updates.",

    why: "Notifications help you notice important information without checking every page.",

    how: [
      "Open Notifications from the topbar.",
      "Read new notifications.",
      "Check any important warnings.",
      "Take action when required.",
    ],

    useful: "Notifications help you stay aware of important account and financial events.",

    tip: "Check notifications regularly so you do not miss important updates.",
  },

  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    color: "gray",

    what: "Manage your Ledgerly preferences and account settings.",

    why: "Settings allow you to control how your application works for you.",

    how: [
      "Open Settings.",
      "Review the available options.",
      "Update the information you want to change.",
      "Save your changes.",
    ],

    useful: "Keep your account information and preferences up to date.",

    tip: "Review your settings whenever you make an important account change.",
  },
];

export default function Guide() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);

  const currentFeature = features[currentStep];

  const Icon = currentFeature.icon;

  const isFirst = currentStep === 0;
  const isLast = currentStep === features.length - 1;

  const progress =
    ((currentStep + 1) / features.length) * 100;

  function nextStep() {
    if (isLast) {
      completeGuide();
      return;
    }

    setCurrentStep((previous) => previous + 1);
  }

  function previousStep() {
    if (!isFirst) {
      setCurrentStep((previous) => previous - 1);
    }
  }

  function skipGuide() {
    completeGuide();
  }

  function completeGuide() {
    localStorage.setItem(
      "ledgerly_guide_completed",
      "true"
    );

    // Remove the old key if it exists.
    localStorage.removeItem(
      "ledgerflow_guide_completed"
    );

    navigate("/dashboard", {
      replace: true,
    });
  }

  function goToFeature(index) {
    setCurrentStep(index);
  }

  return (
    <div className="guide-page">

      {/* =========================================
          BACKGROUND DECORATION
      ========================================= */}

      <div className="guide-background-shape guide-shape-one" />
      <div className="guide-background-shape guide-shape-two" />
      <div className="guide-background-shape guide-shape-three" />

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="guide-header">

        <div className="guide-brand">
          <div className="guide-brand-icon">
            <BookOpen size={21} />
          </div>

          <div>
            <strong>Ledgerly</strong>
            <span>Smart Bookkeeping</span>
          </div>
        </div>

        <button
          type="button"
          className="guide-skip-button"
          onClick={skipGuide}
        >
          <X size={17} />
          Skip Guide
        </button>

      </header>

      {/* =========================================
          HERO
      ========================================= */}

      <section className="guide-intro">

        <div className="guide-intro-badge">
          <PlayCircle size={16} />
          Quick Product Tour
        </div>

        <h1>
          Welcome to{" "}
          <span>Ledgerly</span>
        </h1>

        <p>
          Let's take a quick tour of Ledgerly and learn
          how each feature can make your bookkeeping
          easier.
        </p>

      </section>

      {/* =========================================
          PROGRESS
      ========================================= */}

      <section className="guide-progress-section">

        <div className="guide-progress-top">
          <span>
            Feature {currentStep + 1} of {features.length}
          </span>

          <strong>
            {Math.round(progress)}% complete
          </strong>
        </div>

        <div className="guide-progress-track">
          <div
            className="guide-progress-bar"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

      </section>

      {/* =========================================
          FEATURE NAVIGATION
      ========================================= */}

      <div className="guide-feature-selector">

        {features.map((feature, index) => {
          const FeatureIcon = feature.icon;

          return (
            <button
              type="button"
              key={feature.id}
              className={`guide-feature-dot ${
                index === currentStep
                  ? "active"
                  : ""
              } ${
                index < currentStep
                  ? "completed"
                  : ""
              }`}
              onClick={() => goToFeature(index)}
              title={feature.title}
            >
              {index < currentStep ? (
                <Check size={13} />
              ) : (
                <FeatureIcon size={15} />
              )}
            </button>
          );
        })}

      </div>

      {/* =========================================
          MAIN GUIDE CARD
      ========================================= */}

      <main className="guide-main">

        <div
          key={currentFeature.id}
          className="guide-feature-card"
        >

          {/* LEFT SIDE */}

          <div className="guide-feature-left">

            <div
              className={`guide-feature-icon ${currentFeature.color}`}
            >
              <Icon size={38} />
            </div>

            <div className="guide-feature-number">
              STEP {String(currentStep + 1).padStart(2, "0")}
            </div>

            <h2>
              {currentFeature.title}
            </h2>

            <p className="guide-feature-what">
              {currentFeature.what}
            </p>

            <div className="guide-tip">

              <Lightbulb size={19} />

              <div>
                <strong>Quick Tip</strong>

                <p>
                  {currentFeature.tip}
                </p>
              </div>

            </div>

          </div>

          {/* RIGHT SIDE */}

          <div className="guide-feature-right">

            {/* WHY */}

            <div className="guide-info-block">

              <div className="guide-info-title">
                <span className="guide-info-number">
                  01
                </span>

                <h3>
                  Why use it?
                </h3>
              </div>

              <p>
                {currentFeature.why}
              </p>

            </div>

            {/* HOW */}

            <div className="guide-info-block">

              <div className="guide-info-title">
                <span className="guide-info-number">
                  02
                </span>

                <h3>
                  How to use it
                </h3>
              </div>

              <div className="guide-steps">

                {currentFeature.how.map(
                  (step, index) => (
                    <div
                      className="guide-step"
                      key={index}
                    >
                      <span>
                        {index + 1}
                      </span>

                      <p>
                        {step}
                      </p>
                    </div>
                  )
                )}

              </div>

            </div>

            {/* USEFUL */}

            <div className="guide-useful">

              <Check size={18} />

              <div>
                <strong>
                  How is this useful?
                </strong>

                <p>
                  {currentFeature.useful}
                </p>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* =========================================
          CONTROLS
      ========================================= */}

      <footer className="guide-footer">

        <button
          type="button"
          className="guide-previous"
          onClick={previousStep}
          disabled={isFirst}
        >
          <ChevronLeft size={18} />
          Previous
        </button>

        <div className="guide-footer-center">
          <span>
            {currentFeature.title}
          </span>

          <div className="guide-mini-dots">
            {features.map((_, index) => (
              <button
                key={index}
                type="button"
                className={
                  index === currentStep
                    ? "active"
                    : ""
                }
                onClick={() =>
                  goToFeature(index)
                }
                aria-label={`Go to step ${
                  index + 1
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          className="guide-next"
          onClick={nextStep}
        >
          {isLast ? (
            <>
              Finish Guide
              <Check size={18} />
            </>
          ) : (
            <>
              Next
              <ChevronRight size={18} />
            </>
          )}
        </button>

      </footer>

    </div>
  );
}