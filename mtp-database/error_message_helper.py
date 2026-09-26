import json
import re
import sys
from colorama import Fore, Back, Style, init

# Initialize colorama
init(autoreset=True)

class ErrorMessageHelper:
    def __init__(self, config_file='error_messages.json'):
        with open(config_file, 'r') as f:
            self.config = json.load(f)
        
        # Visual elements
        self.box_top = "╔" + "═" * 78 + "╗"
        self.box_bottom = "╚" + "═" * 78 + "╝"
        self.box_mid = "╠" + "═" * 78 + "╣"
        self.box_line = "║" + " " * 78 + "║"
    
    def box_text(self, text, color=Fore.WHITE, center=False):
        """Put text in a box"""
        lines = text.split('\n')
        result = []
        for line in lines:
            if center:
                line = line.center(78)
            else:
                line = " " + line.ljust(77)
            result.append(color + "║" + line + "║" + Style.RESET_ALL)
        return '\n'.join(result)
    
    def create_header(self, title, subtitle="", error_type="ERROR"):
        """Create an attractive header"""
        output = "\n" * 2
        
        # Top border with color
        if error_type == "ERROR":
            color = Fore.RED
            bg_color = Back.RED
            icon = "❌"
        elif error_type == "WARNING":
            color = Fore.YELLOW
            bg_color = Back.YELLOW
            icon = "⚠️"
        else:
            color = Fore.CYAN
            bg_color = Back.CYAN
            icon = "ℹ️"
        
        # Attention grabber
        output += color + "▓" * 80 + Style.RESET_ALL + "\n"
        output += color + "▓" * 80 + Style.RESET_ALL + "\n"
        output += color + self.box_top + Style.RESET_ALL + "\n"
        
        # Title
        title_text = f"{icon}  {title}  {icon}"
        output += self.box_text(title_text.center(78), bg_color + Fore.WHITE + Style.BRIGHT, center=True) + "\n"
        
        if subtitle:
            output += color + self.box_mid + Style.RESET_ALL + "\n"
            output += self.box_text(subtitle, Fore.WHITE, center=True) + "\n"
        
        output += color + self.box_bottom + Style.RESET_ALL + "\n"
        output += color + "▓" * 80 + Style.RESET_ALL + "\n"
        output += color + "▓" * 80 + Style.RESET_ALL + "\n"
        
        return output
    
    def create_section(self, icon, title, content, color=Fore.WHITE):
        """Create a formatted section"""
        output = "\n"
        output += color + Style.BRIGHT + "┏━━ " + icon + "  " + title + " " + "━" * (70 - len(title)) + "┓" + Style.RESET_ALL + "\n"
        
        for line in content.split('\n'):
            if line.strip():
                output += color + "┃ " + Style.RESET_ALL + line + "\n"
        
        output += color + "┗" + "━" * 78 + "┛" + Style.RESET_ALL + "\n"
        return output
    
    def create_solution_box(self, steps):
        """Create an attractive solution box"""
        output = "\n"
        output += Fore.GREEN + Style.BRIGHT + "┏" + "━" * 78 + "┓" + Style.RESET_ALL + "\n"
        output += Fore.GREEN + Style.BRIGHT + "┃" + "  ✅ HOW TO FIX THIS  ".center(78) + "┃" + Style.RESET_ALL + "\n"
        output += Fore.GREEN + Style.BRIGHT + "┣" + "━" * 78 + "┫" + Style.RESET_ALL + "\n"
        
        for step in steps:
            if step.strip():
                # Highlight numbers
                step_formatted = re.sub(r'^(\d+\.)', Fore.CYAN + Style.BRIGHT + r'\1' + Style.RESET_ALL, step.strip())
                output += Fore.GREEN + "┃ " + Style.RESET_ALL + step_formatted + "\n"
        
        output += Fore.GREEN + Style.BRIGHT + "┗" + "━" * 78 + "┛" + Style.RESET_ALL + "\n"
        return output
    
    def create_code_example(self, code, title="Example"):
        """Create a code example box"""
        output = "\n"
        output += Fore.CYAN + "╭" + "─" * 78 + "╮" + Style.RESET_ALL + "\n"
        output += Fore.CYAN + "│ " + Style.BRIGHT + "📝 " + title + Style.RESET_ALL + " " * (72 - len(title)) + Fore.CYAN + "│" + Style.RESET_ALL + "\n"
        output += Fore.CYAN + "├" + "─" * 78 + "┤" + Style.RESET_ALL + "\n"
        
        for line in code.split('\n'):
            # Syntax highlighting for SQL keywords
            line = re.sub(r'\b(CREATE|DROP|IF EXISTS|FUNCTION|PROCEDURE|TABLE|VIEW|PRIMARY KEY|INDEX)\b', 
                         Fore.MAGENTA + Style.BRIGHT + r'\1' + Style.RESET_ALL, line, flags=re.IGNORECASE)
            line = re.sub(r'--.*$', Fore.GREEN + r'\g<0>' + Style.RESET_ALL, line)
            
            output += Fore.CYAN + "│ " + Style.RESET_ALL + line.ljust(76) + Fore.CYAN + " │" + Style.RESET_ALL + "\n"
        
        output += Fore.CYAN + "╰" + "─" * 78 + "╯" + Style.RESET_ALL + "\n"
        return output
    
    def parse_liquibase_error(self, error_output):
        """Parse Liquibase specific errors"""
        for error_type, details in self.config['liquibase_errors'].items():
            pattern = details['pattern']
            if re.search(pattern, error_output, re.IGNORECASE):
                return error_type, details['message']
        return None, None
    
    def get_vulnerability_message(self, vulnerability_type):
        """Get message for specific vulnerability"""
        if vulnerability_type in self.config['vulnerability_messages']:
            return self.config['vulnerability_messages'][vulnerability_type]
        return None
    
    def format_liquibase_error(self, error_output, context=''):
        """Format Liquibase command errors with attractive styling"""
        error_type, message = self.parse_liquibase_error(error_output)
        
        if not message:
            return self.create_header("LIQUIBASE ERROR", "Unknown Error Type") + "\n" + error_output
        
        # Parse message parts
        lines = message.split('\n')
        title = lines[0].replace('⚠️', '').replace('❌', '').strip()
        
        problem = ""
        solution = []
        example = ""
        note = ""
        
        in_solution = False
        in_example = False
        
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            if line.startswith('❌ Problem:'):
                problem = line.replace('❌ Problem:', '').strip()
            elif line.startswith('✅ Solution:'):
                in_solution = True
            elif line.startswith('Example:'):
                in_example = True
            elif line.startswith('Note:'):
                note = line.replace('Note:', '').strip()
            elif line.startswith('Affected Changeset:'):
                context += "\n" + line
            elif line.startswith('File:'):
                context += "\n" + line
            elif in_example:
                example += line + "\n"
            elif in_solution and line:
                solution.append(line)
        
        # Build output
        output = self.create_header(title, "Liquibase Validation Failed", "ERROR")
        
        if problem:
            output += self.create_section("🔍", "PROBLEM DETECTED", problem, Fore.RED)
        
        if solution:
            output += self.create_solution_box(solution)
        
        if example:
            output += self.create_code_example(example, "Correct Usage")
        
        if context:
            output += self.create_section("📋", "DETAILS", context, Fore.YELLOW)
        
        if note:
            output += self.create_section("💡", "IMPORTANT NOTE", note, Fore.CYAN)
        
        # Original error in collapsed view
        output += "\n" + Fore.WHITE + Style.DIM + "─" * 80 + Style.RESET_ALL + "\n"
        output += Fore.WHITE + Style.DIM + "Original Error Output:" + Style.RESET_ALL + "\n"
        output += Fore.WHITE + Style.DIM + error_output[:500] + "..." + Style.RESET_ALL + "\n"
        output += Fore.WHITE + Style.DIM + "─" * 80 + Style.RESET_ALL + "\n"
        
        return output
    
    def format_vulnerability_error(self, vulnerability_type, file_path=''):
        """Format vulnerability/missing dependency errors"""
        details = self.get_vulnerability_message(vulnerability_type)
        if not details:
            return f"Unknown vulnerability: {vulnerability_type}"
        
        message = details['message']
        expected = details.get('expected', False)
        
        # Parse message
        lines = message.split('\n')
        title = lines[0].replace('⚠️', '').replace('❌', '').strip()
        
        problem = ""
        solution = []
        example = ""
        note = ""
        
        in_solution = False
        
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            if line.startswith('❌ Problem:'):
                problem = line.replace('❌ Problem:', '').strip()
            elif line.startswith('✅ Solution:'):
                in_solution = True
            elif line.startswith('Example:'):
                # Collect example until we hit something else
                idx = lines.index(line)
                example = '\n'.join(lines[idx+1:])
                break
            elif line.startswith('Note:'):
                note = line.replace('Note:', '').strip()
            elif in_solution and line:
                solution.append(line)
        
        # Build output
        error_type = "WARNING" if not expected else "ERROR"
        output = self.create_header(title, f"File: {file_path}" if file_path else "", error_type)
        
        if problem:
            output += self.create_section("🔍", "PROBLEM DETECTED", problem, Fore.RED)
        
        if solution:
            output += self.create_solution_box(solution)
        
        if example:
            # Extract just the code part
            code_lines = []
            for line in example.split('\n'):
                if line.strip() and not line.strip().startswith('Note:'):
                    code_lines.append(line)
            if code_lines:
                output += self.create_code_example('\n'.join(code_lines), "Correct Usage")
        
        if note:
            output += self.create_section("💡", "IMPORTANT NOTE", note, Fore.CYAN)
        
        return output
    
    def format_vulnerability_clean(self, vuln_type, index, total, is_missing=False):
        """Format individual vulnerability with clean structure"""
        # Extract line numbers if present
        line_info = ""
        base_vuln = vuln_type
        
        line_match = re.search(r'\(lines:\s*([\d,\s]+)\)', vuln_type)
        file_level_match = re.search(r'\(file-level\)', vuln_type)
        
        if line_match:
            lines = line_match.group(1)
            line_info = f" (lines: {lines})"
            # Remove line info from vulnerability name for lookup
            base_vuln = re.sub(r'\s*\(lines:.*?\)', '', vuln_type).strip()
        elif file_level_match:
            line_info = " (file-level)"
            base_vuln = re.sub(r'\s*\(file-level\)', '', vuln_type).strip()
        
        details = self.get_vulnerability_message(base_vuln)
        if not details:
            return f"  Issue {index}/{total}: ⚠️  Unknown: {vuln_type}\n\n"
        
        message = details['message']
        lines = message.split('\n')
        
        # Extract components
        title = lines[0].replace('⚠️', '').replace('❌', '').strip()
        problem = ""
        solutions = []
        example = ""
        note = ""
        
        in_solution = False
        in_example = False
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            if '❌ Problem:' in line:
                # Get next non-empty line
                for j in range(i+1, len(lines)):
                    if lines[j].strip():
                        problem = lines[j].strip()
                        break
            elif '✅ Solution:' in line:
                in_solution = True
                in_example = False
            elif line.startswith('Example:'):
                in_example = True
                in_solution = False
            elif line.startswith('Note:'):
                note = line.replace('Note:', '').strip()
                in_solution = False
                in_example = False
            elif in_solution and line:
                solutions.append(line)
            elif in_example and line:
                example += line + "\n"
        
        # Build output
        icon = Fore.YELLOW + "⚠️ " + Style.RESET_ALL if is_missing else Fore.RED + "❌" + Style.RESET_ALL
        output = f"  Issue {index}/{total}: {icon} " + Fore.WHITE + Style.BRIGHT + title + line_info + Style.RESET_ALL + "\n"
        output += f"  {Fore.CYAN}{'-' * 76}{Style.RESET_ALL}\n"
        
        if problem:
            output += Fore.WHITE + "  Problem:\n" + Style.RESET_ALL
            output += f"    {problem}\n\n"
        
        if solutions:
            output += Fore.GREEN + "  How to fix:\n" + Style.RESET_ALL
            for sol in solutions[:3]:  # Show max 3 solutions
                output += f"    {sol}\n"
            output += "\n"
        
        if example:
            output += Fore.CYAN + "  Example:\n" + Style.RESET_ALL
            for line in example.split('\n')[:3]:  # Show max 3 lines
                if line.strip():
                    output += Fore.WHITE + Style.DIM + f"    {line}\n" + Style.RESET_ALL
            output += "\n"
        
        if note:
            output += Fore.CYAN + "  Note: " + Style.RESET_ALL + f"{note}\n\n"
        
        return output
    
    def format_compilation_errors(self, error_list):
        """Format compilation errors with clean, user-friendly styling"""
        if not error_list:
            return ""
        
        output = "\n"
        output += Fore.RED + "=" * 80 + Style.RESET_ALL + "\n"
        output += Fore.RED + Style.BRIGHT + f"❌ COMPILATION FAILED - {len(error_list)} file(s) with issues\n" + Style.RESET_ALL
        output += Fore.RED + "=" * 80 + Style.RESET_ALL + "\n"
        
        for idx, error in enumerate(error_list, 1):
            file_match = re.match(r'(.*?)\s*-\s*block_start(.*)block_end', error)
            if not file_match:
                output += f"\nFile {idx}: {error}\n"
                continue
            
            file_path = file_match.group(1).strip()
            error_info = file_match.group(2).strip()
            
            # Parse vulnerabilities and missing dependencies.
            # The inner group uses  [^()]*(?:\([^()]*\)[^()]*)*  instead of .*?
            # so it correctly handles one level of nested parens such as
            # "CASCADE (lines: 10,25)" without stopping at the first inner ")".
            # The trailing alternation includes $ because block_end is already
            # consumed by the outer file_match, so it is absent from error_info.
            _INNER = r'[^()]*(?:\([^()]*\)[^()]*)*'
            vuln_match = re.search(
                r'(\d+)\s+vulnerabilit(?:y|ies)\s*\((' + _INNER + r')\)'
                r'(?:,\s*\d+\s+missing|\s*block_end|$)',
                error_info
            )
            missing_match = re.search(
                r'(\d+)\s+missing dependenc(?:y|ies)\s*\((' + _INNER + r')\)'
                r'(?:\s*block_end|$)',
                error_info
            )
            
            # Count total issues
            total_issues = 0
            vulnerabilities = []
            missing = []
            
            if vuln_match:
                total_issues += int(vuln_match.group(1))
                # Split by pattern: comma followed by uppercase letter (start of next rule)
                # This handles "CASCADE (lines: 10,25), DROP TABLE (lines: 30)"
                vuln_str = vuln_match.group(2)
                # Split by "), " which separates different vulnerabilities
                vuln_parts = re.split(r'\),\s*(?=[A-Z])', vuln_str)
                vulnerabilities = [v.strip() + (')' if not v.strip().endswith(')') else '') for v in vuln_parts]
            if missing_match:
                total_issues += int(missing_match.group(1))
                # Same logic for missing dependencies
                missing_str = missing_match.group(2)
                missing_parts = re.split(r'\),\s*(?=[A-Z])', missing_str)
                missing = [m.strip() + (')' if not m.strip().endswith(')') else '') for m in missing_parts]
            
            # File header
            output += f"\n{Fore.CYAN}{'─' * 80}{Style.RESET_ALL}\n"
            output += Fore.CYAN + Style.BRIGHT + f"File {idx}: 📄 {file_path}\n" + Style.RESET_ALL
            output += f"{Fore.CYAN}{'─' * 80}{Style.RESET_ALL}\n"
            output += Fore.YELLOW + f"Found {total_issues} issue(s) in this file:\n" + Style.RESET_ALL
            output += "\n"
            
            # Format vulnerabilities
            if vuln_match:
                for vuln_idx, vuln in enumerate(vulnerabilities, 1):
                    output += self.format_vulnerability_clean(vuln, vuln_idx, total_issues)
            
            # Format missing dependencies
            if missing_match:
                start_idx = len(vulnerabilities) + 1 if vuln_match else 1
                for miss_idx, miss in enumerate(missing, start_idx):
                    output += self.format_vulnerability_clean(miss, miss_idx, total_issues, is_missing=True)
        
        output += f"\n{Fore.GREEN}{'=' * 80}{Style.RESET_ALL}\n"
        output += Fore.CYAN + "💡 Need help? Contact: " + Style.RESET_ALL
        output += Fore.YELLOW + "db-architects@impactanalytics.co\n" + Style.RESET_ALL
        output += Fore.GREEN + "=" * 80 + Style.RESET_ALL + "\n"
        
        return output
    
    def format_compilation_summary(self, failed_count, total_count):
        """Format the final compilation summary dynamically"""
        summaries = self.config.get('summary_messages', {})
        
        if failed_count == 0:
            # All passed
            config = summaries.get('all_passed', {})
            border_char = config.get('border', '=')
            icon = config.get('icon', '✅')
            title = config.get('title', 'ALL PASSED')
            success_msg = config.get('success_message', 'All compiled successfully!').format(total=total_count)
            
            output = f"\n{Fore.GREEN}{border_char*80}{Style.RESET_ALL}\n"
            output += f"{Fore.GREEN}  {icon} {title} {icon}  {Style.RESET_ALL}\n"
            output += f"{Fore.GREEN}{border_char*80}{Style.RESET_ALL}\n"
            output += f"{Fore.GREEN}{success_msg}{Style.RESET_ALL}\n"
            output += f"{Fore.GREEN}{border_char*80}{Style.RESET_ALL}\n"
            
        elif failed_count == total_count:
            # All failed
            config = summaries.get('all_failed', {})
            border_char = config.get('border', '=')
            icon = config.get('icon', '❌')
            title = config.get('title', 'COMPILATION FAILED')
            summary_label = config.get('summary_label', '📊 Summary:')
            total_label = config.get('total_label', 'Total clients with errors: {failed}/{total}').format(failed=failed_count, total=total_count)
            review_msg = config.get('review_message', 'Please review the detailed errors above.')
            help_msg = config.get('help_message', 'Need help? Contact support')
            
            output = f"\n{Fore.RED}{border_char*80}{Style.RESET_ALL}\n"
            output += f"{Fore.RED}{border_char*80}{Style.RESET_ALL}\n"
            output += f"{Fore.RED}  {icon} {title} {icon}  {Style.RESET_ALL}\n"
            output += f"{Fore.RED}{border_char*80}{Style.RESET_ALL}\n"
            output += f"{Fore.YELLOW}{summary_label}{Style.RESET_ALL}\n"
            output += f"{Fore.YELLOW}   {total_label}{Style.RESET_ALL}\n"
            output += f"\n{Fore.YELLOW}{review_msg}{Style.RESET_ALL}\n"
            output += f"{Fore.CYAN}{help_msg}{Style.RESET_ALL}\n"
            output += f"{Fore.RED}{border_char*80}{Style.RESET_ALL}\n"
            output += f"{Fore.RED}{border_char*80}{Style.RESET_ALL}\n"
            
        else:
            # Partial failure
            config = summaries.get('partial_failed', {})
            border_char = config.get('border', '=')
            icon = config.get('icon', '⚠️')
            title = config.get('title', 'PARTIAL COMPILATION')
            passed_count = total_count - failed_count
            passed_label = config.get('passed_label', '✅ Passed: {passed}/{total}').format(passed=passed_count, total=total_count)
            failed_label = config.get('failed_label', '❌ Failed: {failed}/{total}').format(failed=failed_count, total=total_count)
            
            output = f"\n{Fore.YELLOW}{border_char*80}{Style.RESET_ALL}\n"
            output += f"{Fore.YELLOW}{icon}  {title}{Style.RESET_ALL}\n"
            output += f"{Fore.GREEN}{passed_label}{Style.RESET_ALL}\n"
            output += f"{Fore.RED}{failed_label}{Style.RESET_ALL}\n"
            output += f"{Fore.YELLOW}{border_char*80}{Style.RESET_ALL}\n"
        
        return output

    def format_error_for_email_html(self, error_string, file_path=""):
        """
        Format error message for HTML email
        Returns: list of dicts with {type, title, problem, solutions, example, note, is_missing}
        """
        # Parse error string.
        # Uses nested-paren-safe pattern instead of lazy (.*?) so that
        # "CASCADE (lines: 10,25)" is captured correctly as one vulnerability.
        # The $ anchor handles strings where block_end was already consumed.
        _INNER = r'[^()]*(?:\([^()]*\)[^()]*)*'
        vuln_match = re.search(
            r'(\d+)\s+vulnerabilit(?:y|ies)\s*\((' + _INNER + r')\)'
            r'(?:,\s*\d+\s+missing|\s*block_end|$)',
            error_string
        )
        missing_match = re.search(
            r'(\d+)\s+missing dependenc(?:y|ies)\s*\((' + _INNER + r')\)'
            r'(?:\s*block_end|$)',
            error_string
        )
        
        formatted_errors = []
        
        # Process vulnerabilities
        if vuln_match:
            vuln_str = vuln_match.group(2)
            # Split by "), " which separates different vulnerabilities
            vuln_parts = re.split(r'\),\s*(?=[A-Z])', vuln_str)
            vulnerabilities = [v.strip() + (')' if not v.strip().endswith(')') else '') for v in vuln_parts]
            
            for vuln in vulnerabilities:
                # Extract base vulnerability name (without line numbers)
                base_vuln = re.sub(r'\s*\(lines:.*?\)', '', vuln).strip()
                details = self.get_vulnerability_message(base_vuln)
                if details:
                    formatted_errors.append(self._parse_error_message(details['message'], vuln, False))
        
        # Process missing dependencies
        if missing_match:
            missing_str = missing_match.group(2)
            missing_parts = re.split(r'\),\s*(?=[A-Z])', missing_str)
            missing = [m.strip() + (')' if not m.strip().endswith(')') else '') for m in missing_parts]
            
            for miss in missing:
                # Extract base missing dependency name (without file-level marker)
                base_miss = re.sub(r'\s*\((file-level|lines:.*?)\)', '', miss).strip()
                details = self.get_vulnerability_message(base_miss)
                if details:
                    formatted_errors.append(self._parse_error_message(details['message'], miss, True))
        
        return formatted_errors
    
    def _parse_error_message(self, message, error_type, is_missing=False):
        """Parse error message into components"""
        lines = message.split('\n')
        title = lines[0].replace('⚠️', '').replace('❌', '').strip()
        
        problem = ""
        solutions = []
        example = ""
        note = ""
        
        in_solution = False
        in_example = False
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            if '❌ Problem:' in line:
                problem = line.replace('❌ Problem:', '').strip()
            elif '✅ Solution:' in line:
                in_solution = True
                in_example = False
            elif 'Example:' in line:
                in_solution = False
                in_example = True
            elif 'Note:' in line:
                note = line.replace('Note:', '').strip()
                in_solution = False
                in_example = False
            elif in_solution and line and not line.startswith('Example'):
                solutions.append(line.replace('•', '').strip())
            elif in_example and line:
                example += line + '\n'
        
        return {
            'type': error_type,
            'title': title,
            'problem': problem,
            'solutions': solutions,
            'example': example.strip(),
            'note': note,
            'is_missing': is_missing
        }

# CLI usage
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python error_message_helper.py <error_type> '<error_output>' [context]")
        print("Error types: liquibase, compilation, vulnerability")
        sys.exit(1)
    
    error_type = sys.argv[1]
    error_output = sys.argv[2]
    context = sys.argv[3] if len(sys.argv) > 3 else ''
    
    helper = ErrorMessageHelper()
    
    if error_type == 'liquibase':
        print(helper.format_liquibase_error(error_output, context))
    elif error_type == 'compilation':
        # For testing, wrap in list
        errors = [error_output] if isinstance(error_output, str) else error_output
        print(helper.format_compilation_errors(errors))
    elif error_type == 'vulnerability':
        vuln_name = context if context else error_output
        print(helper.format_vulnerability_error(vuln_name, error_output if context else ''))