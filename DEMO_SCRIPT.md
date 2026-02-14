# OpsTwin AI — Demo Script for Judges

## Setup (Before Demo)
1. Ensure the backend is running on Vultr VM
2. Open the web app in Chrome (full screen)
3. Reset simulation: click "Reset" button

---

## Demo Flow (5 minutes)

### Act 1: The Vision (30 seconds)
> "This is OpsTwin AI — an AI Control Tower for autonomous warehouses. It's a digital twin that uses Gemini AI to orchestrate multi-robot coordination in real time. Everything you see runs in simulation, but the architecture is production-ready for real hardware."

Point out:
- The 2D warehouse grid (racks, aisles, packing zone, charging stations)
- 6 autonomous robots at their starting positions
- KPI dashboard on the right (all zeros — fresh start)

### Act 2: First Order (60 seconds)
> "Let's create our first order."

1. In the Order Control panel, select location **A1**, quantity **1**, priority **High**
2. Click **Create Order**
3. Point out:
   - The AI Decision Log shows Gemini's reasoning for which robot was assigned
   - A robot starts moving toward the item location
   - The path is visible as a dotted line

> "Gemini selected this robot based on proximity and battery level. No hardcoded rules — pure AI reasoning."

4. Watch the robot navigate, pick the item, deliver to packing zone
5. KPI dashboard updates: 1 order completed, task time shown

### Act 3: Multi-Robot Coordination (90 seconds)
> "Now let's stress-test the system."

1. Click **"Demo: 5 Random Orders"**
2. Watch multiple robots activate simultaneously
3. Point out:
   - Different robots assigned to different orders
   - Paths avoid each other (collision avoidance)
   - Battery levels draining as robots move
   - AI Decision Log filling with Gemini reasoning

> "Each assignment is a Gemini API call. The AI considers robot position, battery level, current workload, and item proximity."

4. Click **"Demo: 5 Random Orders"** again for 10 total active orders

### Act 4: Congestion & Adaptation (60 seconds)
> "Watch what happens when the system detects congestion."

Point to areas where multiple robots converge:
- The system detects congestion zones (red overlay)
- Gemini triggers rerouting for affected robots
- Event log shows "Congestion resolved, X robots rerouted"

> "This is dynamic — no scripted behavior. Gemini reasons about the warehouse state and makes real-time decisions."

### Act 5: Battery Management (30 seconds)
> "As robots work, their batteries drain. When a robot hits 20%, Gemini intervenes."

Look for a low-battery alert in the event log:
- Robot gets sent to charging station
- If it was carrying a task, the task gets reassigned to another robot
- Reassignment count increments in the KPI dashboard

### Act 6: System of Record (30 seconds)
> "Everything runs through a Vultr VM backend. The VM is the single source of truth — robot states, orders, task queues, metrics. All stored in SQLite, all served via REST + WebSocket."

Point to the footer: "System of Record: Vultr VM"

### Closing (30 seconds)
> "OpsTwin AI is a simulation-to-real training pipeline. The same architecture — the same API, the same AI planning layer — can connect to real robots via ROS2 or fleet management APIs. Today it's a simulation. Tomorrow it's a warehouse."

Show final KPI dashboard:
- Orders completed
- Average task time
- Robot utilization
- Throughput per hour

---

## If Questions Come Up

**Q: Why Gemini?**
> "Gemini's structured JSON output is reliable for task planning. The Flash model gives us sub-second response times for reactive decisions."

**Q: Why Vultr?**
> "Vultr is the central brain — the system of record. Every robot state, every order, every metric lives on the VM. It's the coordination engine."

**Q: How does this scale?**
> "The architecture is stateless at the edge. Add more robots, the backend handles assignment. Add more warehouses, deploy more VMs. The AI layer scales horizontally."

**Q: Is this production-ready?**
> "The simulation layer swaps out for hardware drivers. The API layer, planning layer, and data layer are production architecture."
