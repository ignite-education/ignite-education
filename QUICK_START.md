# Knowledge Check - Quick Start Guide 🚀

## 📍 Your Servers are Running

- ✅ **Frontend**: http://localhost:5174
- ✅ **Backend**: http://localhost:3001

---

## 🎯 3 Steps to Test

### STEP 1: Set Up Database (2 minutes)

1. Go to: https://supabase.com/dashboard/project/yjvdakdghkfnlhdpbocg
2. Click **"SQL Editor"** in left sidebar
3. Copy ALL content from `supabase_knowledge_check_table.sql`
4. Paste and click **"Run"**
5. Go to **"Table Editor"** → Verify you see `knowledge_check_results` table

✅ Done!

---

### STEP 2: Test Knowledge Check (5 minutes)

1. **Open**: http://localhost:5174
2. **Click** any lesson to start
3. **Click** "Continue" through all sections
4. **Click** "Continue" on the LAST section
5. **Modal appears!** 🎉
6. **Answer** the 15 questions Will asks
7. **Watch** it work!

**Pass Path** (get 12+ correct):
- See "Proceed to Next Lesson" button
- Click it → goes back to hub
- Lesson marked complete ✅

**Fail Path** (get <12 correct):
- See "Retake Knowledge Check" button
- Click it → starts over with new questions

---

### STEP 3: Verify Logging (1 minute)

1. Go back to Supabase → **Table Editor** → `knowledge_check_results`
2. See your test results!
3. Check the `answers` field to see all Q&A pairs

✅ All done!

---

## 🎨 What You Should See

### When Knowledge Check Opens:
```
┌─────────────────────────────────────────────┐
│ Knowledge Check - [Lesson Name]            │  ← White text above box
├─────────────────────────────────────────────┤
│ Question 1 of 15        Score: 0/0     [X] │  ← Progress bar
│ ─────────────────────────                   │  ← Purple bar fills
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ What is product-market fit?          │  │  ← Will's question (gray)
│  └──────────────────────────────────────┘  │
│                                             │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Type your answer here...             │  │  ← Your input
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │        Submit Answer                 │  │  ← Purple button
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### After You Answer:
```
  ┌──────────────────────────────────────┐
  │ What is product-market fit?          │  ← Will's question
  └──────────────────────────────────────┘

              ┌──────────────────────────┐
              │ It's when your product   │  ← Your answer (purple, right)
              │ meets market demand      │
              └──────────────────────────┘

  ┌──────────────────────────────────────┐
  │ Great! That's correct! PMF means...  │  ← Will's feedback
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │ Next question: What are OKRs?        │  ← Next question
  └──────────────────────────────────────┘
```

---

## ⚡ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Modal doesn't appear | You need to be on the LAST section. Click Continue more. |
| No questions load | Check server.js is running on port 3001 |
| Database error | Run the SQL script in Supabase first |
| Can't answer | Make sure input is not empty |

---

## 📚 Full Documentation

For complete details, see:
- **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** - Comprehensive testing guide
- **[KNOWLEDGE_CHECK_SETUP.md](KNOWLEDGE_CHECK_SETUP.md)** - Setup and customization docs
- **[supabase_knowledge_check_table.sql](supabase_knowledge_check_table.sql)** - Database schema

---

## 🎉 That's It!

You're ready to test! Just follow the 3 steps above.

**Questions?** Check the full docs or browser console for errors.
