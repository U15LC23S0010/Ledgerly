import { Plus, Download, Settings, ArrowRight } from "lucide-react";
import "./GenericPage.css";

export default function GenericPage({
  title,
  subtitle,
  icon: Icon,
  primaryAction = "Add new",
}) {
  return (
    <div className="generic-page">

      <div className="generic-header">
        <div className="generic-header-left">
          <div className="generic-icon">
            {Icon && <Icon />}
          </div>

          <div>
            <span className="generic-eyebrow">
              LEDGERFLOW WORKSPACE
            </span>

            <h1>{title}</h1>

            <p>{subtitle}</p>
          </div>
        </div>

        <div className="generic-actions">
          <button className="secondary-action">
            <Download />
            Export
          </button>

          <button className="primary-action">
            <Plus />
            {primaryAction}
          </button>
        </div>
      </div>

      <div className="generic-stats">
        <div>
          <span>Total records</span>
          <strong>0</strong>
          <small>Current workspace</small>
        </div>

        <div>
          <span>This month</span>
          <strong>₹0.00</strong>
          <small>No activity yet</small>
        </div>

        <div>
          <span>Active</span>
          <strong>0</strong>
          <small>Currently active</small>
        </div>

        <div>
          <span>Last updated</span>
          <strong>Today</strong>
          <small>Workspace status</small>
        </div>
      </div>

      <div className="generic-content">

        <section className="generic-card">
          <div className="card-heading">
            <div>
              <span>OVERVIEW</span>
              <h2>{title}</h2>
            </div>

            <button>
              <Settings />
            </button>
          </div>

          <div className="empty-state">
            <div className="empty-icon">
              {Icon && <Icon />}
            </div>

            <h3>No {title.toLowerCase()} yet</h3>

            <p>
              Start adding information to your LedgerFlow
              workspace. Your records will appear here.
            </p>

            <button className="primary-action">
              <Plus />
              {primaryAction}
            </button>
          </div>
        </section>

        <section className="generic-card quick-card">

          <div className="card-heading">
            <div>
              <span>QUICK ACTIONS</span>
              <h2>Workspace tools</h2>
            </div>
          </div>

          <button className="tool-row">
            <span>Manage {title}</span>
            <ArrowRight />
          </button>

          <button className="tool-row">
            <span>Export data</span>
            <Download />
          </button>

          <button className="tool-row">
            <span>Configure settings</span>
            <Settings />
          </button>

        </section>

      </div>

    </div>
  );
}