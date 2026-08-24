import { useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ReceiptText,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";

import api from "../api/api";

import "./AutoExpense.css";

export default function AutoExpense() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);


  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess(null);

    const value = text.trim();

    if (!value) {
      setError("Please describe your expense.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auto-expense/",
        {
          text: value,
          auto_create: true,
        }
      );

      console.log(
        "AUTO EXPENSE RESPONSE:",
        response.data
      );

      const data = response.data;

      // ===================================================
      // LOW CONFIDENCE
      // ===================================================

      if (
        data.requires_confirmation === true
      ) {
        setError(
          data.message ||
            "Please confirm the expense details."
        );

        setSuccess({
          ...data,
          expense: data.expense,
        });

        return;
      }

      // ===================================================
      // DUPLICATE
      // ===================================================

      if (data.duplicate === true) {
        setError(
          data.message ||
            "A similar transaction already exists."
        );

        setSuccess({
          ...data,
          expense:
            data.parsed_expense ||
            data.expense,
        });

        return;
      }

      // ===================================================
      // SUCCESS
      // ===================================================

      if (data.success === true) {
        setSuccess(data);
        setText("");
        return;
      }

      // ===================================================
      // UNKNOWN RESPONSE
      // ===================================================

      setError(
        data.message ||
          "Could not create the expense."
      );

    } catch (err) {
      console.error(
        "Auto expense error:",
        err
      );

      const responseData =
        err.response?.data;

      const message =
        responseData?.detail;

      if (Array.isArray(message)) {
        setError(
          message
            .map(
              (item) =>
                item.msg || String(item)
            )
            .join(", ")
        );
      } else if (
        typeof message === "object" &&
        message !== null
      ) {
        setError(
          message.message ||
            "Could not create the expense."
        );
      } else {
        setError(
          message ||
            "Could not create the expense. Please try again."
        );
      }

    } finally {
      setLoading(false);
    }
  }

  // =======================================================
  // EXAMPLE
  // =======================================================

  function useExample(example) {
    setText(example);
    setError("");
    setSuccess(null);
  }

  // =======================================================
  // CLEAR
  // =======================================================

  function clearResult() {
    setSuccess(null);
    setError("");
  }

  // =======================================================
  // GET EXPENSE DATA
  // =======================================================

  const expense =
    success?.expense ||
    success?.parsed_expense ||
    null;

  // =======================================================
  // FORMAT AMOUNT
  // =======================================================

  function formatAmount(amount) {
    const number = Number(amount || 0);

    return `₹${number.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="auto-expense-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="auto-expense-header">

        <div>

          <span className="auto-expense-eyebrow">
            AI EXPENSE ASSISTANT
          </span>

          <h1>
            Auto Expense
          </h1>

          <p>
            Describe your expense naturally and
            let AI organize it for you.
          </p>

        </div>

        <div className="auto-expense-header-icon">
          <Sparkles />
        </div>

      </div>


      {/* =================================================
          MAIN CARD
      ================================================= */}

      <div className="auto-expense-card">

        {/* =================================================
            CARD HEADER
        ================================================= */}

        <div className="auto-expense-card-header">

          <div className="auto-expense-icon">
            <ReceiptText />
          </div>

          <div>

            <h2>
              Add an expense with AI
            </h2>

            <p>
              Just tell us what you spent,
              where, and how much.
            </p>

          </div>

        </div>


        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="auto-expense-form"
        >

          <label htmlFor="expense-text">
            Describe your expense
          </label>


          <textarea
            id="expense-text"
            value={text}
            onChange={(event) =>
              setText(
                event.target.value
              )
            }
            placeholder="Example: I spent ₹500 on pizza yesterday"
            rows={5}
            disabled={loading}
          />


          <div className="auto-expense-hint">

            <Sparkles />

            <span>
              Try natural language like:
              "Paid ₹1200 for petrol today"
            </span>

          </div>


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="auto-expense-message error">

              <AlertCircle />

              <span>
                {error}
              </span>

            </div>

          )}


          {/* =================================================
              SUCCESS / PARSED RESULT
          ================================================= */}

          {success && expense && (

            <div className="auto-expense-success">

              <div className="success-header">

                {success.success ? (
                  <CheckCircle2 />
                ) : (
                  <AlertCircle />
                )}

                <strong>
                  {success.success
                    ? "Expense added successfully"
                    : "Expense details detected"}
                </strong>

                <button
                  type="button"
                  className="success-close"
                  onClick={clearResult}
                  aria-label="Close result"
                >
                  <X />
                </button>

              </div>


              {/* =================================================
                  AI CONFIDENCE
              ================================================= */}

              {success.ai?.confidence !==
                undefined && (

                <div className="ai-confidence">

                  <span>
                    AI confidence
                  </span>

                  <strong>
                    {Math.round(
                      Number(
                        success.ai.confidence
                      ) * 100
                    )}
                    %
                  </strong>

                </div>

              )}


              {/* =================================================
                  EXPENSE DETAILS
              ================================================= */}

              <div className="success-details">

                {/* DESCRIPTION */}

                <div>

                  <span>
                    Description
                  </span>

                  <strong>
                    {expense.title ||
                      expense.description ||
                      "Expense"}
                  </strong>

                </div>


                {/* CATEGORY */}

                <div>

                  <span>
                    Category
                  </span>

                  <strong>
                    {expense.category ||
                      "Other"}
                  </strong>

                </div>


                {/* AMOUNT */}

                <div>

                  <span>
                    Amount
                  </span>

                  <strong>
                    {formatAmount(
                      expense.amount
                    )}
                  </strong>

                </div>


                {/* DATE */}

                <div>

                  <span>
                    Date
                  </span>

                  <strong>
                    {expense.date
                      ? new Date(
                          expense.date
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )
                      : "—"}
                  </strong>

                </div>

              </div>


              {success.ai?.reason && (

                <div className="ai-reason">

                  <Sparkles />

                  <span>
                    {success.ai.reason}
                  </span>

                </div>

              )}

            </div>

          )}


          {/* =================================================
              BUTTON
          ================================================= */}

          <button
            type="submit"
            className="auto-expense-submit"
            disabled={
              loading ||
              !text.trim()
            }
          >

            {loading ? (

              <>
                <Loader2 className="spin" />

                Processing...
              </>

            ) : (

              <>
                <Sparkles />

                Create Expense
              </>

            )}

          </button>

        </form>


        {/* =================================================
            EXAMPLES
        ================================================= */}

        <div className="auto-expense-examples">

          <div className="examples-header">

            <Wallet />

            <span>
              Quick examples
            </span>

          </div>


          <div className="example-buttons">

            <button
              type="button"
              onClick={() =>
                useExample(
                  "I spent ₹500 on pizza yesterday"
                )
              }
            >
              ₹500 pizza yesterday
            </button>


            <button
              type="button"
              onClick={() =>
                useExample(
                  "Paid ₹1200 for petrol today"
                )
              }
            >
              ₹1200 petrol today
            </button>


            <button
              type="button"
              onClick={() =>
                useExample(
                  "Bought shoes for ₹2500"
                )
              }
            >
              ₹2500 shoes
            </button>


            <button
              type="button"
              onClick={() =>
                useExample(
                  "Paid ₹800 for electricity bill"
                )
              }
            >
              ₹800 electricity bill
            </button>


            <button
              type="button"
              onClick={() =>
                useExample(
                  "Spent ₹600 on spa"
                )
              }
            >
              ₹600 spa
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}