import os
import zipfile
import sys

def create_zip(browser):
    os.makedirs('dist', exist_ok=True)

    exclude_files = ['dist', 'manifest_chrome.json', 'manifest_firefox.json', 'build.py']
    target_files = []
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_files]
        for file in files:
            if file not in exclude_files:
                target_files.append(os.path.join(root, file))

    with zipfile.ZipFile(f'dist/{browser}.zip', 'w') as zipf:
        zipf.write(f'manifest_{browser}.json', arcname='manifest.json')
        for target_file in target_files:
            zipf.write(target_file, arcname=os.path.relpath(target_file))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python build.py <browser>")
        sys.exit(1)

    browser = sys.argv[1]
    create_zip(browser)
