import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LayoutDashboard,
  Receipt,
  Tags,
  WalletCards,
  BarChart3,
  Lightbulb,
  Sparkles,
  Settings,
  X,
} from "lucide-react";

import "./UserGuide.css";

const GUIDE_STEPS = [
  {
    id: "welcome",
    icon: BookOpen,
    title: "Welcome to LedgerFlow AI",
    description:
      "A simple bookkeeping workspace designed to help you record, organize, and understand your financial activity.",
    points: [
      "Keep your bookkeeping information organized.",
      "Record expenses and manage financial data.",
      "Monitor budgets and spending.",
      "Understand your finances through analytics and insights.",
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Your Dashboard",
    description:
      "The Dashboard gives you a quick overview of your financial activity.",
    points: [
      "Review your financial summary.",
      "Check your total spending.",
      "Monitor your budget usage.",
      "Use the dashboard as your starting point.",
    ],
  },
  {
    id: "expenses",
    icon: Receipt,
    title: "Record Expenses",
    description:
      "Use Expenses to record the money your business spends.",
    points: [
      "Enter a clear expense title.",
      "Enter the amount as a number.",
      "Choose the appropriate category.",
      "Enter the correct date.",
      "Review the information before saving.",
    ],
  },
  {
    id: "categories",
    icon: Tags,
    title: "Organize with Categories",
    description:
      "Categories make it easier to understand where your money is going.",
    points: [
      "Create categories that match your bookkeeping needs.",
      "Use consistent category names.",
      "Select the correct category when recording expenses.",
      "Use categories when reviewing analytics.",
    ],
  },
  {
    id: "budget",
    icon: WalletCards,
    title: "Manage Your Budget",
    description:
      "Set a monthly budget and monitor your spending against it.",
    points: [
      "Enter your planned monthly budget.",
      "Monitor how much of the budget has been used.",
      "Check your remaining budget.",
      "Update the budget when your financial plan changes.",
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Understand Your Analytics",
    description:
      "Analytics helps you identify spending patterns.",
    points: [
      "Review overall spending.",
      "Review spending by category.",
      "Identify categories with higher spending.",
      "Use accurate expense records for better analysis.",
    ],
  },
  {
    id: "insights",
    icon: Lightbulb,
    title: "Get Financial Insights",
    description:
      "Insights provide useful observations based on your bookkeeping data.",
    points: [
      "Review generated financial observations.",
      "Look for unusual spending patterns.",
      "Identify areas where spending can be controlled.",
      "Use insights together with your actual records.",
    ],
  },
  {
    id: "auto-expense",
    icon: Sparkles,
    title: "Use Auto Expense",
    description:
      "Auto Expense lets you describe an expense using simple text.",
    points: [
      "Describe what you spent money on.",
      "Include the amount.",
      "Mention a category when possible.",
      "Review the generated information before using it.",
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "Customize LedgerFlow AI",
    description:
      "Settings lets you personalize how the application works for you.",
    points: [
      "Change your business name.",
      "Choose your currency.",
      "Choose your date format.",
      "Change Light, Dark, or System appearance.",
      "Choose your preferred layout density.",
      "Customize dashboard preferences.",
    ],
  },
  {
    id: "complete",
    icon: CheckCircle2,
    title: "You're Ready to Go",
    description:
      "You now know the main features of LedgerFlow AI.",
    points: [
      "Start by setting up your categories.",
      "Record your first expense.",
      "Set your monthly budget.",
      "Review your Dashboard and Analytics.",
      "Use Insights to understand your financial activity.",
    ],
  },
];

export default function UserGuide() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);

  const step = GUIDE_STEPS[currentStep];
  const Icon = step.icon;

  const isFirst = currentStep === 0;
  const isLast = currentStep === GUIDE_STEPS.length - 1;

  const progress =
    ((currentStep + 1) / GUIDE_STEPS.length) * 100;

  function nextStep() {
    if (isLast) {
      localStorage.setItem(
        "ledgerflow_guide_completed",
        "true"
      );

      navigate("/dashboard");
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
    localStorage.setItem(
      "ledgerflow_guide_completed",
      "true"
    );

    navigate("/dashboard");
  }

  function exitGuide() {
    navigate("/dashboard");
  }

  return (
    <div className="user-guide-page">

      {/* Header */}

      <header className="user-guide-header">

        <div className="user-guide-brand">

          <div className="user-guide-brand-icon">
            <BookOpen />
          </div>

          <div>
            <span>LEDGERFLOW AI</span>
            <h1>User Guide</h1>
          </div>

        </div>

        <button
          type="button"
          className="user-guide-close"
          onClick={exitGuide}
          aria-label="Close guide"
        >
          <X />
        </button>

      </header>


      {/* Progress */}

      <div className="user-guide-progress">

        <div className="user-guide-progress-info">
          <span>
            Step {currentStep + 1} of {GUIDE_STEPS.length}
          </span>

          <span>
            {Math.round(progress)}%
          </span>
        </div>

        <div className="user-guide-progress-track">
          <div
            className="user-guide-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

      </div>


      {/* Main */}

      <main className="user-guide-main">

        <div
          key={step.id}
          className="user-guide-card"
        >

          <div className="user-guide-card-icon">
            <Icon />
          </div>

          <span className="user-guide-eyebrow">
            {isFirst
              ? "GETTING STARTED"
              : isLast
              ? "COMPLETE"
              : "LEDGERFLOW AI"}
          </span>

          <h2>{step.title}</h2>

          <p className="user-guide-description">
            {step.description}
          </p>


          <div className="user-guide-points">

            {step.points.map((point) => (
              <div
                className="user-guide-point"
                key={point}
              >
                <CheckCircle2 />
                <span>{point}</span>
              </div>
            ))}

          </div>


          {/* Navigation */}

          <div className="user-guide-actions">

            <button
              type="button"
              className="user-guide-skip"
              onClick={skipGuide}
            >
              Skip guide
            </button>

            <div className="user-guide-navigation">

              <button
                type="button"
                className="user-guide-back"
                onClick={previousStep}
                disabled={isFirst}
              >
                <ArrowLeft />
                Back
              </button>

              <button
                type="button"
                className="user-guide-next"
                onClick={nextStep}
              >
                {isLast
                  ? "Start using LedgerFlow"
                  : "Next"}

                <ArrowRight />
              </button>

            </div>

          </div>

        </div>

      </main>


      {/* Dots */}

      <div className="user-guide-dots">

        {GUIDE_STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={
              index === currentStep
                ? "user-guide-dot active"
                : "user-guide-dot"
            }
            onClick={() => setCurrentStep(index)}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}

      </div>

    </div>
  );
}