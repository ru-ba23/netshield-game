# NetShield (درع الشبكة)

A 2D Cybersecurity Defense Action Platformer built with **HTML5, CSS3, JavaScript, and Phaser 3**.

## How to Play
- **Move Left / Right:** `Arrow Left / Right` or `A / D`
- **Jump:** `Arrow Up`, `W`, or `Space`
- **Fire Scan Pulse:** `F` (neutralizes Phishing Nodes and pushes back Viruses)
- **Mute / Unmute Audio:** `M`

## Missions
1. Neutralize **2 Phishing Nodes** using your Scan Pulse (`F`).
2. Collect **3 Encryption Keys** across the network platforms.
3. Reach and activate the **Main Firewall Core** at the end of the stage.

## Technical Concepts Implemented
- **Scenes:** `MainMenuScene`, `GameScene`, `EndScene`
- **Background images:** Custom cyber circuit background (`cyber_bg`)
- **Tile sprites:** Repeating neon floor (`floor_tile`)
- **Spritesheets:** Animated Cyber Guardian character (`guardian_sheet`) & Malware Viruses (`virus_sheet`)
- **Physics:** Arcade gravity, collisions, velocity, and overlaps
- **Object manipulation:** Pushable security data crates (`data_crate`) & interactive nodes
- **Input:** Keyboard controls & interactive UI buttons
- **Cameras:** Smooth camera tracking across the 2400px level
- **Audio output:** Synthesized Web Audio sound effects & background music with mute toggle
