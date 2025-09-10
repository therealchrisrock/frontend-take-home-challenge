import { cookies } from "next/headers";
import { getSkinStyles } from "~/lib/skins/get-skin-styles";

const SKIN_COOKIE_KEY = "checkers-skin";

export async function SkinStyleInjector() {
  const cookieStore = await cookies();
  const skinId = cookieStore.get(SKIN_COOKIE_KEY)?.value ?? "the-og";
  const styles = getSkinStyles(skinId);

  if (!styles) return null;

  return (
    <>
      <style
        id="skin-styles-server"
        dangerouslySetInnerHTML={{
          __html: `:root {${styles}}`,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Apply skin immediately to prevent FOUC
            (function() {
              try {
                // Try to get skin from localStorage first
                const savedSkin = localStorage.getItem('checkers-current-skin');
                if (savedSkin && savedSkin !== '${skinId}') {
                  // If localStorage has a different skin, apply it immediately
                  const styles = document.getElementById('skin-styles-server');
                  if (styles) {
                    // We'll update this once the client loads with the actual skin data
                    document.cookie = 'checkers-skin=' + savedSkin + '; path=/; max-age=31536000; SameSite=Lax';
                  }
                } else if (!savedSkin) {
                  // If no saved skin, save the cookie value to localStorage
                  localStorage.setItem('checkers-current-skin', '${skinId}');
                }
              } catch (e) {
                // Ignore errors (e.g., if localStorage is not available)
              }
            })();
          `,
        }}
      />
    </>
  );
}
