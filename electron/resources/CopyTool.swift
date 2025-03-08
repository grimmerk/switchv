import Cocoa
import Carbon
import ApplicationServices

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

// Get the frontmost application's process ID
func getFrontmostApplication() -> (pid: pid_t, name: String)? {
    print("DEBUG: Getting frontmost application")
    
    if let app = NSWorkspace.shared.frontmostApplication {
        print("DEBUG: Frontmost app: \(app.localizedName ?? "unknown"), PID: \(app.processIdentifier)")
        return (app.processIdentifier, app.localizedName ?? "unknown")
    }
    
    print("DEBUG: Could not get frontmost application")
    return nil
}

// Get AXUIElement for a specific application
func getApplicationElement(pid: pid_t) -> AXUIElement {
    print("DEBUG: Creating application AXUIElement for pid: \(pid)")
    return AXUIElementCreateApplication(pid)
}

// Get selected text directly using Accessibility API
func getSelectedTextDirectly() -> String {
    print("DEBUG: Starting getSelectedTextDirectly")
    
    // First, try to get the frontmost application
    guard let frontApp = getFrontmostApplication() else {
        print("DEBUG: Could not get frontmost application")
        return "NO_SELECTION"
    }
    
    // Create application element instead of system-wide element
    let appElement = getApplicationElement(pid: frontApp.pid)
    print("DEBUG: Got application element for \(frontApp.name)")
    
    // Try to get focused element from application
    var focusedElement: AnyObject?
    var focusedResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    print("DEBUG: App focused element result: \(focusedResult)")
    
    // If we couldn't get focused element from app, try system-wide as fallback
    if focusedResult != .success {
        print("DEBUG: Falling back to system-wide element")
        let systemWideElement = AXUIElementCreateSystemWide()
        
        focusedResult = AXUIElementCopyAttributeValue(
            systemWideElement,
            kAXFocusedUIElementAttribute as CFString,
            &focusedElement
        )
        
        print("DEBUG: System-wide focused element result: \(focusedResult)")
    }
    
    // If we still couldn't get a focused element, try alternative approaches
    if focusedResult != .success {
        print("DEBUG: No focused element found, trying to find selected text in frontmost app")
        
        // Try to directly get the selected text from the application
        var appSelectedText: AnyObject?
        let appSelectedResult = AXUIElementCopyAttributeValue(
            appElement,
            kAXSelectedTextAttribute as CFString,
            &appSelectedText
        )
        
        print("DEBUG: App selected text result: \(appSelectedResult)")
        if appSelectedResult == .success, let text = appSelectedText as? String, !text.isEmpty {
            print("DEBUG: Found selected text directly from application")
            return text
        }
        
        // Try to get main window and search from there
        var mainWindow: AnyObject?
        let windowResult = AXUIElementCopyAttributeValue(
            appElement,
            kAXMainWindowAttribute as CFString, 
            &mainWindow
        )
        
        print("DEBUG: Main window result: \(windowResult)")
        if windowResult == .success {
            print("DEBUG: Searching for selection in main window")
            let selectedText = findSelectionInElement(mainWindow as! AXUIElement)
            if !selectedText.isEmpty && selectedText != "NO_SELECTION" {
                return selectedText
            }
        }
        
        // If all else fails, try to get all windows and search each one
        var windows: AnyObject?
        let windowsResult = AXUIElementCopyAttributeValue(
            appElement,
            kAXWindowsAttribute as CFString,
            &windows
        )
        
        print("DEBUG: Windows result: \(windowsResult)")
        if windowsResult == .success, let windowArray = windows as? [AXUIElement] {
            print("DEBUG: Found \(windowArray.count) windows")
            
            for window in windowArray {
                let selectedText = findSelectionInElement(window)
                if !selectedText.isEmpty && selectedText != "NO_SELECTION" {
                    return selectedText
                }
            }
        }
        
        print("DEBUG: Could not find selection in any window")
        return "NO_SELECTION"
    }
    
    // Get role of focused element for debugging
    var role: AnyObject?
    _ = AXUIElementCopyAttributeValue(
        focusedElement as! AXUIElement,
        kAXRoleAttribute as CFString,
        &role
    )
    print("DEBUG: Focused element role: \(role as? String ?? "unknown")")
    
    // Try to get selected text from focused element
    var selectedText: AnyObject?
    let result = AXUIElementCopyAttributeValue(
        focusedElement as! AXUIElement,
        kAXSelectedTextAttribute as CFString,
        &selectedText
    )
    
    print("DEBUG: kAXSelectedTextAttribute result: \(result)")
    if result == .success, let text = selectedText as? String, !text.isEmpty {
        print("DEBUG: Found selected text via kAXSelectedTextAttribute")
        return text
    }
    
    // Alternative approach - get value then selected range
    var value: AnyObject?
    let valueResult = AXUIElementCopyAttributeValue(
        focusedElement as! AXUIElement,
        kAXValueAttribute as CFString,
        &value
    )
    
    print("DEBUG: kAXValueAttribute result: \(valueResult)")
    if valueResult == .success {
        print("DEBUG: Value type: \(type(of: value))")
        print("DEBUG: Value content: \(value as? String ?? "not a string")")
    }
    
    var selectedRange: AnyObject?
    let rangeResult = AXUIElementCopyAttributeValue(
        focusedElement as! AXUIElement,
        kAXSelectedTextRangeAttribute as CFString,
        &selectedRange
    )
    
    print("DEBUG: kAXSelectedTextRangeAttribute result: \(rangeResult)")
    if rangeResult == .success {
        print("DEBUG: Range type: \(type(of: selectedRange))")
        if let range = selectedRange as? CFRange {
            print("DEBUG: Range location: \(range.location), length: \(range.length)")
        }
    }
    
    if valueResult == .success && rangeResult == .success,
       let fullText = value as? String,
       let range = selectedRange as? CFRange {
        if range.length > 0 && range.location >= 0 && fullText.count >= range.location + range.length {
            let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
            let endIndex = fullText.index(startIndex, offsetBy: range.length)
            let extractedText = String(fullText[startIndex..<endIndex])
            if !extractedText.isEmpty {
                print("DEBUG: Extracted text using range: \(extractedText)")
                return extractedText
            }
        }
    }
    
    // Try a different approach - walk through child elements to find selection
    print("DEBUG: Trying to find selection in child elements")
    let selection = findSelectionInChildren(focusedElement as! AXUIElement)
    if !selection.isEmpty {
        print("DEBUG: Found selection in children: \(selection)")
        return selection
    }
    
    // If all else fails, try to get the entire text content of the element
    if let fullText = value as? String, !fullText.isEmpty {
        // Check if there are other attributes that might indicate this is selected text
        var isFocused: AnyObject?
        AXUIElementCopyAttributeValue(
            focusedElement as! AXUIElement,
            kAXFocusedAttribute as CFString,
            &isFocused
        )
        
        if isFocused as? Bool == true {
            print("DEBUG: Returning full text of focused element")
            return fullText
        }
    }
    
    print("DEBUG: No selection found using any method")
    return "NO_SELECTION"
}

// Function to check an element for selected text
func findSelectionInElement(_ element: AXUIElement) -> String {
    print("DEBUG: Checking element for selection")
    
    // First try direct selection on this element
    var selectedText: AnyObject?
    let result = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextAttribute as CFString,
        &selectedText
    )
    
    if result == .success, let text = selectedText as? String, !text.isEmpty {
        print("DEBUG: Found selected text in element")
        return text
    }
    
    // Try value and range approach
    var value: AnyObject?
    let valueResult = AXUIElementCopyAttributeValue(
        element,
        kAXValueAttribute as CFString,
        &value
    )
    
    var selectedRange: AnyObject?
    let rangeResult = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextRangeAttribute as CFString,
        &selectedRange
    )
    
    if valueResult == .success && rangeResult == .success,
       let fullText = value as? String,
       let range = selectedRange as? CFRange,
       range.length > 0 {
        let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
        let endIndex = fullText.index(startIndex, offsetBy: range.length)
        let extractedText = String(fullText[startIndex..<endIndex])
        if !extractedText.isEmpty {
            print("DEBUG: Extracted text using range")
            return extractedText
        }
    }
    
    // Try focused element within this element
    var focusedElement: AnyObject?
    let focusedResult = AXUIElementCopyAttributeValue(
        element, 
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    if focusedResult == .success {
        print("DEBUG: Found focused element within, checking it")
        let focusedText = findSelectionInElement(focusedElement as! AXUIElement)
        if !focusedText.isEmpty && focusedText != "NO_SELECTION" {
            return focusedText
        }
    }
    
    // If none of the above worked, check children
    return findSelectionInChildren(element)
}

// Recursive function to look for selection in child elements
func findSelectionInChildren(_ element: AXUIElement) -> String {
    // Try to get children
    var children: AnyObject?
    let childResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )
    
    if childResult == .success, let childArray = children as? [AXUIElement] {
        print("DEBUG: Found \(childArray.count) children")
        
        // First, check each child for selection
        for child in childArray {
            // Check direct selection on child
            let childSelection = findSelectionInElement(child)
            if !childSelection.isEmpty && childSelection != "NO_SELECTION" {
                return childSelection
            }
        }
    }
    
    // Try specific element types that might contain text
    // Look for common roles and try to find text in them
    var role: AnyObject?
    _ = AXUIElementCopyAttributeValue(
        element,
        kAXRoleAttribute as CFString,
        &role
    )
    
    if let roleStr = role as? String {
        print("DEBUG: Element role: \(roleStr)")
        
        // Text fields, text areas, etc. often have these roles
        if roleStr.contains("Text") || roleStr == "AXTextArea" || roleStr == "AXTextField" {
            var value: AnyObject?
            let valueResult = AXUIElementCopyAttributeValue(
                element,
                kAXValueAttribute as CFString,
                &value
            )
            
            if valueResult == .success, let text = value as? String, !text.isEmpty {
                print("DEBUG: Found text in \(roleStr)")
                return text
            }
        }
    }
    
    return ""
}

// Main function
func main() {
    // Command line arguments handling
    let args = CommandLine.arguments
    var shouldPrompt = false
    
    // Parse arguments
    for i in 1..<args.count {
        if args[i] == "--prompt" {
            shouldPrompt = true
        }
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
    
    // Get selected text directly using Accessibility API
    let selectedText = getSelectedTextDirectly()
    
    // If we got text, return it
    if selectedText != "NO_SELECTION" {
        print(selectedText)
        exit(0)
    } else {
        // No text was selected
        print("NO_SELECTION")
        exit(3)
    }
}

// Execute main function
main()