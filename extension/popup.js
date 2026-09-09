'use strict';
const api = typeof browser !== 'undefined' ? browser : chrome;
const toggle = document.getElementById('enabled');
const status = document.getElementById('status');
toggle.disabled = true;
api.declarativeNetRequest.getEnabledRulesets().then(ids => {
  toggle.checked = ids.includes('protection');
  status.textContent = toggle.checked ? 'Rules enabled. Site permission is also required.' : 'Protection is off.';
  toggle.disabled = false;
}).catch(() => {status.textContent = 'Could not access blocking rules. Check Safari compatibility and extension permissions.';});
toggle.addEventListener('change', async () => {
  toggle.disabled = true;
  const intended = toggle.checked;
  try {
    await api.declarativeNetRequest.updateEnabledRulesets({enableRulesetIds:intended?['protection']:[],disableRulesetIds:intended?[]:['protection']});
    try {
      await api.storage.local.set({disabled:!intended});
    } catch (error) {
      await api.declarativeNetRequest.updateEnabledRulesets({enableRulesetIds:intended?[]:['protection'],disableRulesetIds:intended?['protection']:[]});
      throw error;
    }
    status.textContent = 'Protection '+(intended?'on':'off')+'. Reload your NovelCool page.';
  } catch {
    toggle.checked = !intended;
    status.textContent = 'Change failed. Check Safari extension permissions.';
  } finally {toggle.disabled = false;}
});
