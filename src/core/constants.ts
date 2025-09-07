export const SUPPORTED_COMMANDS = new Set([
  'project', 'cmake_minimum_required', 'set', 'add_executable', 'add_library', 'target_link_libraries',
  'target_include_directories', 'target_compile_definitions', 'target_compile_options', 'install', 'option', 'include',
  'add_subdirectory', 'message', 'function', 'endfunction', 'macro', 'endmacro', 'if', 'elseif', 'else', 'endif', 'list', 'file',
  'return', 'find_package', 'find_library', 'find_path', 'find_program', 'add_custom_command', 'add_custom_target',
  'add_test', 'enable_testing'
]);
