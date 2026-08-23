(async () => {
  try {
    const res = await fetch('https://nexora-bk.vercel.app/admin/pyqs');
    const html = await res.text();
    const scriptMatch = html.match(/<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)"><\/script>/);
    if (!scriptMatch) {
      console.log("Script not found in HTML:", html.substring(0, 500));
      return;
    }
    const scriptUrl = 'https://nexora-bk.vercel.app' + scriptMatch[1];
    console.log("Script URL:", scriptUrl);
    const jsRes = await fetch(scriptUrl);
    const js = await jsRes.text();
    console.log("Contains DepartmentManagerDialog:", js.includes('DepartmentManagerDialog'));
    console.log("Contains AdminIaContributionsSection:", js.includes('AdminIaContributionsSection'));
    console.log("Contains useListSemesterQpDepartments:", js.includes('useListSemesterQpDepartments'));
  } catch (e) {
    console.error(e);
  }
})();
