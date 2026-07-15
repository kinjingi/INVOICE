const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Find where page-gstDashboard starts
const gstStart = html.indexOf('<!-- GST Dashboard -->');

// Let's look at what's immediately before GST Dashboard
const beforeGst = html.substring(gstStart - 300, gstStart);
console.log('Before GST:', beforeGst);

// It should be:
// </div>
// </div>
// </div>
// <!-- ═══ END SETTINGS ═══ -->
// </div><!-- /main-content -->

// We'll use a regex to replace everything from the end of Autosave & Performance to GST Dashboard
const fixRegex = /<div class="card-header"><span class="card-title">Autosave & Performance<\/span><\/div>[\s\S]*?(?=<!-- GST Dashboard -->)/;

const fixedSettingsEnd = `<div class="card-header"><span class="card-title">Autosave & Performance</span></div>
            <div class="card-body">
              <div class="form-group mb-3">
                <label class="form-label">Autosave Interval</label>
                <select class="form-control"><option>Every 30 seconds</option><option>Every 1 minute</option><option>Every 5 minutes</option><option>Disabled</option></select>
              </div>
              <div class="form-group mb-3">
                <label class="form-label">Rows per page (Invoice History)</label>
                <select class="form-control"><option>25</option><option>50</option><option>100</option></select>
              </div>
              <div class="form-group">
                <label class="form-label">Keyboard Navigation</label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:6px;">
                  <input type="checkbox" checked style="accent-color:var(--primary)">
                  <span style="font-size:13px;">Tab key auto-advances to next row</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- ═══ END SETTINGS ═══ -->
  </div><!-- /main-content -->

  `;

html = html.replace(fixRegex, fixedSettingsEnd);

// Finally, make sure there is no trailing </div><!-- /main-content --> at the end of the file
const endOfFileBadTags = /<\/div><!-- \/main-content --><\/main>[\s]*$/;
if (endOfFileBadTags.test(html)) {
    html = html.replace(endOfFileBadTags, '</main>\n');
}

fs.writeFileSync('index.html', html);
console.log('Fixed settings end and main-content closing tag!');
