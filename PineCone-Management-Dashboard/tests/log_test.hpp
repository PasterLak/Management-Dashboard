#include "extentions/Log.hpp"

void testLogPrintln() {
    // Test basic string formatting
    Log::println("Hello world!");
    Log::println("Simple message");

    // Test single placeholder
    Log::println("Number: {}", 42);
    Log::println("Text: {}", "test string");
    Log::println("Float: {}", 3.14159f);
    Log::println("Double: {}", 2.71828);
    Log::println("Char: {}", 'A');
    Log::println("Bool true: {}", true);
    Log::println("Bool false: {}", false);

    // Test multiple placeholders
    Log::println("Name: {}, Age: {}", "Alice", 30);
    Log::println("X: {}, Y: {}, Z: {}", 10.5, 20.3, 30.7);
    Log::println("Values: {}, {}, {}", 1, 2, 3);

    // Test with different integer types
    Log::println("int: {}", 100);
    Log::println("unsigned: {}", 200u);
    Log::println("long: {}", 1000L);
    Log::println("unsigned long: {}", 2000UL);
    Log::println("long long: {}", 10000LL);
    Log::println("unsigned long long: {}", 20000ULL);

    // Test escaping
    Log::println("Escaped braces: \\{\\}");
    Log::println("Backslash: \\");
    Log::println("Placeholder with escape: {} \\{}", "value", "not a placeholder");

    // Test with leftover arguments (separator enabled)
    Log::println("Not enough placeholders", 123, "extra");

    // Test with leftover arguments (separator disabled)
    Log::setSeparatorEnabled(false);
    Log::println("No separator:", 456, "extra");
    Log::setSeparatorEnabled(true);  // Reset to default

    // Test edge cases
    Log::println("Empty string: {}", "");
    Log::println("Multiple braces: {}{}{}", 1, 2, 3);
    Log::println("Mixed: char='{}', int={}, float={}", 'Z', -99, 123.456);

    // Test with zero arguments
    Log::println("No placeholders at all");

    // Test pointer types (will show as [unsupported])
    int x = 5;
    Log::println("Pointer: {}", &x);

    // Test with special characters
    Log::println("New\\nline and tab\\ttest");
    Log::println("Unicode? {}", "café");  // Note: might not display correctly on all terminals

    // Test performance/edge cases

    char str[100];
    Log::formatToBuffer(str, sizeof(str),"Very long string with {} placeholder in the middle {}", "one", "two");

    Log::println(str);
    Log::println("{}{}{}{}{}", 1, 2, 3, 4, 5);
}
