# 🗳️ Smart Election Guide Assistant

## 🌐 Live Demo
https://your-netlify-link.netlify.app


## 🎯 Chosen Vertical
**Civic Education & Voter Awareness**

This assistant helps first-time voters, students, and citizens understand the election process in a simple and interactive way.

---

## 🧠 Approach & Logic

The solution uses a combination of **rule-based logic and AI responses** to guide users.

- The assistant asks key questions:
  - Age
  - Registration status
  - Location

- Based on user input, it:
  - Determines eligibility
  - Provides step-by-step instructions
  - Suggests next actions

### Decision Flow:
1. Identify user type (new / existing voter)
2. Check eligibility (age, citizenship)
3. Guide through:
   - Registration
   - Document verification
   - Voting process

---

## ⚙️ How the Solution Works

1. User interacts with the assistant  
2. Assistant asks guided questions  
3. Processes responses using logic + AI  
4. Outputs:
   - Personalized voting steps  
   - Election timeline  
   - Required documents  
   - Voting instructions  

---

## ⚠️ Assumptions Made

- Users provide accurate information  
- Internet connection is available  
- Election data is predefined or sourced reliably  
- The assistant provides guidance, not legal authority  

---

## 🚀 Deployment

- Deployment prepared using Docker for Google Cloud Run.
- Due to billing activation delay, live demo is hosted on Netlify.
