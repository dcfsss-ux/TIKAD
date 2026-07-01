import re

team_members = [
    {
        "name": "Engr. Maria Santos",
        "role": "Project Supervisor",
        "bio": "Faculty member of the College of Engineering and Technology, CSU. Oversees the ᜄᜒᜌ internship project and provides technical guidance to the development team.",
        "image": "/images/supervisor.jpg",
        "edu": "Faculty Supervisor<br>Caraga State University",
        "email": "msantos@carsu.edu.ph",
        "grad": "linear-gradient(135deg, #fff, #f0fdf4)",
        "color": "#059669",
        "bg": "#d1fae5"
    },
    {
        "name": "Christian B. Abamo",
        "role": "3D Artist · Intern",
        "bio": "Led the overall architecture of TANAW, developing the 3D map engine and core navigation features that power the entire campus exploration experience.",
        "image": "/images/christian.jpg",
        "edu": "BS Computer Science<br>Caraga State University",
        "email": "cabamo@example.com",
        "grad": "linear-gradient(135deg, #fff, #eff6ff)",
        "color": "#2563eb",
        "bg": "#dbeafe"
    },
    {
        "name": "Jhon Leovil M. Avelino",
        "role": "UX/UI DEVELOPER · Intern",
        "bio": "Led the development of the building information panel and search functionality, making it easy to find offices and facilities across campus.",
        "image": "/images/jhonleovil.jpg",
        "edu": "BS Computer Science<br>Caraga State University",
        "email": "javelino@example.com",
        "grad": "linear-gradient(135deg, #fff, #fef3c7)",
        "color": "#d97706",
        "bg": "#fef3c7"
    },
    {
        "name": "Greg Carl T. Calo",
        "role": "UX/UI DEVELOPER · Intern",
        "bio": "Focused on mobile responsiveness and accessibility testing to ensure TANAW works seamlessly across all screen sizes and devices.",
        "image": "/images/greg.jpg",
        "edu": "BS Computer Science<br>Caraga State University",
        "email": "gcalo@example.com",
        "grad": "linear-gradient(135deg, #fff, #faf5ff)",
        "color": "#9333ea",
        "bg": "#f3e8ff"
    },
    {
        "name": "Roy A. Bayotlang",
        "role": "UX/UI DEVELOPER · Intern",
        "bio": "Led the development of the building information panel and search functionality, making it easy to find offices and facilities across campus.",
        "image": "/images/roy.jpg",
        "edu": "BS Computer Science<br>Caraga State University",
        "email": "rbayotlang@example.com",
        "grad": "linear-gradient(135deg, #fff, #fff1f2)",
        "color": "#e11d48",
        "bg": "#ffe4e6"
    },
    {
        "name": "Cres Steven P. Buque",
        "role": "3D Artist · Intern",
        "bio": "Responsible for creating and applying realistic textures to campus buildings in Blender, bringing the TANAW 3D campus map to life visually.",
        "image": "/images/Cres Steven.jpg",
        "edu": "BS Computer Science<br>Caraga State University",
        "email": "cbuque@example.com",
        "grad": "linear-gradient(135deg, #fff, #ecfdf5)",
        "color": "#10b981",
        "bg": "#d1fae5"
    }
]

html_output = """  <!-- ── TEAM ── -->
  <section class="team" id="team">
    <div class="team-stage">
      <div class="team-header reveal">
        <h2 class="section-title" style="font-family: 'Inter', sans-serif; font-weight: 800; font-size: 40px; color: #0f172a; text-transform: uppercase;">Meet Our Team</h2>
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 16px 0;">
          <div style="height: 1px; width: 60px; background: #009900;"></div>
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #009900;"></div>
          <div style="height: 1px; width: 60px; background: #009900;"></div>
        </div>
        <p class="section-sub" style="font-size: 16px; color: #64748b;">
          The people behind the system
        </p>
      </div>

      <div class="team-carousel reveal" style="position: relative; max-width: 900px; margin: 0 auto;">
        <button class="carousel-btn prev large-carousel-nav" style="position: absolute; left: -24px; top: 50%; transform: translateY(-50%); z-index: 10; width: 48px; height: 48px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0f172a;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button class="carousel-btn next large-carousel-nav" style="position: absolute; right: -24px; top: 50%; transform: translateY(-50%); z-index: 10; width: 48px; height: 48px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0f172a;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        <div class="carousel-window" style="border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.06);">
          <div class="carousel-track" id="carousel-track">
"""

for m in team_members:
    html_output += f"""
            <div class="intern-slide" style="min-width: 100%; box-sizing: border-box; position: relative;">
              <div class="large-team-card" style="display: flex; background: #fff; min-height: 480px; flex-wrap: wrap;">
                
                <!-- Left Image Area -->
                <div class="ltc-image" style="width: 45%; flex-shrink: 0; background: #f1f5f9; position: relative; min-height: 300px;">
                  <img src="{m['image']}" alt="{m['name']}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='/images/placeholder.jpg'"/>
                  
                  <!-- Socials overlay inside image on desktop, below on mobile -->
                  <div class="ltc-socials" style="position: absolute; bottom: 0; left: 0; width: 100%; padding: 24px; display: flex; justify-content: center; gap: 20px; background: #fff;">
                    <a href="#" style="color: #2563eb;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
                    <a href="#" style="color: #e1306c;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg></a>
                    <a href="#" style="color: #1e293b;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"/></svg></a>
                  </div>
                </div>
                
                <!-- Right Content Area -->
                <div class="ltc-content" style="width: 55%; padding: 48px; display: flex; flex-direction: column; background: {m['grad']}; flex-grow: 1;">
                  <h3 style="font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">{m['name']}</h3>
                  <div style="font-size: 14px; font-weight: 500; color: {m['color']}; margin-bottom: 24px;">{m['role']}</div>
                  <div style="width: 40px; height: 2px; background: {m['color']}; margin-bottom: 24px;"></div>
                  
                  <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 32px; flex-grow: 1;">
                    {m['bio']}
                  </p>
                  
                  <div style="display: flex; flex-direction: column; gap: 16px; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 24px;">
                    <div style="display: flex; gap: 16px; align-items: flex-start;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: {m['bg']}; display: flex; align-items: center; justify-content: center; color: {m['color']}; flex-shrink: 0;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap"><path d="M21.42 10.922a2 2 0 0 1-.01 3.016l-7.13 7.14a2 2 0 0 1-2.83 0l-7.13-7.14a2 2 0 0 1-.01-3.016l7.14-7.13a2 2 0 0 1 2.82 0l7.14 7.13z"/><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                      </div>
                      <div>
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Education</div>
                        <div style="font-size: 13px; color: #64748b; line-height: 1.4;">{m['edu']}</div>
                      </div>
                    </div>
                    
                    <div style="display: flex; gap: 16px; align-items: flex-start;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: {m['bg']}; display: flex; align-items: center; justify-content: center; color: {m['color']}; flex-shrink: 0;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <div>
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Role</div>
                        <div style="font-size: 13px; color: #64748b;">{m['role']}</div>
                      </div>
                    </div>
                    
                    <div style="display: flex; gap: 16px; align-items: flex-start;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: {m['bg']}; display: flex; align-items: center; justify-content: center; color: {m['color']}; flex-shrink: 0;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      </div>
                      <div>
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Email</div>
                        <div style="font-size: 13px; color: #64748b;">{m['email']}</div>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
"""

html_output += """
          </div>
        </div>

        <div class="carousel-dots" id="carousel-dots" style="display: flex; justify-content: center; gap: 12px; margin-top: 32px;"></div>
      </div>
    </div>
  </section>"""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_pattern = r'<!-- ── TEAM ── -->\s*<section class="team" id="team">.*?</section>'
new_content = re.sub(start_pattern, html_output, content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated index.html")
