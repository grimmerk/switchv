import Cocoa
import Carbon

// Check if the application has Accessibility permission
func checkAccessibilityPermission() -> Bool {
    let checkOptPrompt = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as NSString
    let options = [checkOptPrompt: false] // Set to false to prevent automatic prompt
    return AXIsProcessTrustedWithOptions(options as CFDictionary)
}

// Request Accessibility permission (will show system dialog)
func requestAccessibilityPermission() -> Bool {
    let checkOptPrompt = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as NSString
    let options = [checkOptPrompt: true] // Set to true to show system dialog
    return AXIsProcessTrustedWithOptions(options as CFDictionary)
}

// Simulate Command+C keyboard shortcut
func simulateCopyCommand() -> Bool {
    // Create event source
    let source = CGEventSource(stateID: .hidSystemState)
    
    // Command+C combo
    // 8 is the keycode for 'c'
    let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 8, keyDown: true)
    let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 8, keyDown: false)
    
    // Add Command modifier
    keyDown?.flags = .maskCommand
    keyUp?.flags = .maskCommand
    
    // Post keyboard events
    keyDown?.post(tap: .cgAnnotatedSessionEventTap)
    keyUp?.post(tap: .cgAnnotatedSessionEventTap)
    
    return true
}

// Get text from clipboard
func getClipboardText() -> String {
    let pasteboard = NSPasteboard.general
    return pasteboard.string(forType: .string) ?? ""
}

// Main function
func main() {
    // Command line arguments handling
    let args = CommandLine.arguments
    var shouldPrompt = false
    
    // If --prompt argument is provided, request permission
    if args.count > 1 && args[1] == "--prompt" {
        shouldPrompt = true
    }
    
    // Check Accessibility permission
    if !checkAccessibilityPermission() {
        if shouldPrompt {
            // Request permission, which shows system prompt
            print("PERMISSION_NEEDED")
            _ = requestAccessibilityPermission()
            exit(2)
        } else {
            // Don't request permission, just return status code
            print("PERMISSION_NEEDED")
            exit(1)
        }
    }
    
    // Give the system a moment to ensure current app selection is complete
    Thread.sleep(forTimeInterval: 0.1)
    
    // Save original clipboard content
    let originalContent = getClipboardText()
    
    // Simulate Command+C
    if simulateCopyCommand() {
        // Allow time for copy operation to complete
        Thread.sleep(forTimeInterval: 0.3)
        
        // Get new clipboard content (selected text)
        let selectedText = getClipboardText()
        
        // If content has changed, output the selected text
        if selectedText != originalContent {
            print(selectedText)
            
            // Restore original clipboard content
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(originalContent, forType: .string)
            exit(0)
        } else {
            // If clipboard content unchanged, likely no text was selected
            print("NO_SELECTION")
            exit(3)
        }
    } else {
        print("COPY_FAILED")
        exit(4)
    }
}

// Execute main function
main()