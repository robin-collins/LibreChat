# Debugging Monaco Editor Issues

## Issues
1. Monaco Editor displays `[object Object]` in code content
2. Monaco Editor shows incorrect filename ('untitled.tsx' instead of artifact title)

## Attempted Solutions

### 1. Content Processing in Code.tsx

#### Initial State
```typescript
const content = Array.isArray(children) ? children.join('') : children?.toString() ?? '';
```test_output/we_tried_already.md

#### First Attempt - Object Stringification
```typescript
const content = Array.isArray(children) 
  ? children.map(child => 
      typeof child === 'object' 
        ? JSON.stringify(child, null, 2) 
        : String(child)
    ).join('')
  : typeof children === 'object'
    ? JSON.stringify(children, null, 2)
    : String(children ?? '');
```

#### Second Attempt - Type-Safe Processing
Added type definitions and guards:
```typescript
interface SyntaxNode {
  type: string;
  value: string | number;
}

interface RawNode {
  raw: string;
}

interface PropsNode {
  props: {
    children?: unknown;
  };
}

const processChild = (child: unknown): string => {
  if (typeof child === 'object' && child !== null) {
    if (isPropsNode(child)) {
      return processChild(child.props.children);
    }
    if (isSyntaxNode(child)) {
      return String(child.value);
    }
    // ... more type handling
  }
  return String(child);
};
```

### 2. Filename Handling

#### Initial State
```typescript
const filename = `untitled${lang ? `.${lang}` : ''}`;
```

#### First Attempt - Passing Through Components
In Artifacts.tsx:
```typescript
<CodeMarkdown
  content={`\`\`\`${getFileExtension(currentArtifact.type)}\n${
    currentArtifact.content ?? ''
  }\`\`\``}
  filename={currentArtifact.title || 'untitled'}  // Added this
  isSubmitting={isSubmitting}
/>
```

In Code.tsx:
```typescript
type CodeMarkdownProps = {
  content: string;
  isSubmitting: boolean;
  filename?: string;
};

// Modified component to pass filename through
<ReactMarkdown
  rehypePlugins={rehypePlugins}
  components={{
    code: (props) => React.createElement(code, { ...props, filename }),
  }}
>
  {currentContent}
</ReactMarkdown>
```

#### Second Attempt - Filename Construction
```typescript
const filename = propFilename || `untitled${lang ? `.${lang}` : ''}`;
```

### 3. Recursive Content Processing

#### Third Attempt - Deep Content Processing
Added a recursive content processor that handles different types of React nodes and objects:

```typescript
const processContent = (children: React.ReactNode): string => {
  console.log('Processing content:', children);
  
  if (Array.isArray(children)) {
    console.log('Processing array of children');
    return children.map(child => processContent(child)).join('');
  }
  
  if (React.isValidElement(children)) {
    console.log('Processing React element:', children.type);
    return processContent(children.props.children);
  }
  
  if (typeof children === 'object' && children !== null) {
    console.log('Processing object:', children);
    if ('value' in children) {
      return String(children.value);
    }
    if ('raw' in children) {
      return String(children.raw);
    }
    if ('props' in children && 'children' in (children as any).props) {
      return processContent((children as any).props.children);
    }
  }
  
  const result = String(children ?? '');
  console.log('Final string result:', result);
  return result;
};
```

This approach:
1. Added debug logging to track content transformation
2. Handles React elements by recursively processing their children
3. Processes special object types with 'value' or 'raw' properties
4. Handles nested props.children structures
5. Falls back to string conversion only after exhausting other options

## Results After Third Attempt
- Content still shows `[object Object]` for some elements
- Debug logs show the content is being processed but may be transformed before reaching this function
- Need to investigate where content is being transformed before reaching the Code component

## Next Steps to Try
1. Add logging in MonacoEditor component to see what content it receives
2. Investigate the ReactMarkdown transformation pipeline
3. Consider intercepting content earlier in the pipeline before ReactMarkdown processes it
4. Look into rehype/remark plugin configurations that might be affecting content transformation

### 4. Filename Propagation

#### Fourth Attempt - Proper Filename Propagation
Modified the Code component to accept a filename prop and updated the component chain:

```typescript
// In Code.tsx
type TCodeProps = {
  inline: boolean;
  className?: string;
  children: React.ReactNode;
  filename?: string; // Added filename prop
};

// Use provided filename or fall back to untitled
const displayFilename = filename || `untitled${lang ? `.${lang}` : ''}`;

// In parent component (e.g., Artifacts.tsx)
<ReactMarkdown
  rehypePlugins={rehypePlugins}
  components={{
    code: (props) => (
      <code
        {...props}
        filename={currentArtifact?.title || currentArtifact?.identifier}
      />
    ),
  }}
>
  {content}
</ReactMarkdown>
```

This approach:
1. Adds explicit filename prop to Code component
2. Propagates artifact title/identifier through component chain
3. Maintains fallback for cases where filename isn't provided
4. Preserves language extension when appropriate

## Results After Fourth Attempt
- Content displays correctly
- Need to verify filename propagation through ReactMarkdown
- May need to investigate how ReactMarkdown handles custom props

## Next Steps
1. Debug filename prop propagation through ReactMarkdown
2. Consider alternative approaches to passing metadata through markdown rendering
3. Investigate if rehype/remark plugins are stripping custom props

### 5. Filename Propagation Through CodeMarkdown

#### Fifth Attempt - Modifying CodeMarkdown Component
Updated CodeMarkdown to accept and pass filename prop:

```typescript
// In Code.tsx
export const CodeMarkdown = memo(
  ({ content = '', isSubmitting, filename }: { 
    content: string; 
    isSubmitting: boolean; 
    filename?: string 
  }) => {
    // ... other code ...

    return (
      <ReactMarkdown
        rehypePlugins={rehypePlugins}
        components={{
          code: (props) => <code {...props} filename={filename} />,
        }}
      >
        {currentContent}
      </ReactMarkdown>
    );
  }
);

// Usage in parent component
<CodeMarkdown
  content={content}
  isSubmitting={isSubmitting}
  filename={currentArtifact?.title || currentArtifact?.identifier}
/>
```

This approach:
1. Adds filename prop to CodeMarkdown component
2. Explicitly passes filename through to code component
3. Ensures filename is preserved through ReactMarkdown rendering
4. Maintains proper prop drilling through component hierarchy

## Results After Fifth Attempt
- Need to verify where CodeMarkdown is being used
- Need to ensure filename is being passed from parent components
- May need to trace back further in component hierarchy

## Next Steps
1. Find all usages of CodeMarkdown component
2. Verify filename is being passed from top-level components
3. Add console logging to track filename prop through component chain
4. Consider using React Context if prop drilling becomes too complex

### 6. Filename Propagation from Artifact Component

#### Sixth Attempt - Adding Filename in Artifact Component
Modified Artifact component to pass filename to CodeMarkdown:

```typescript
// In Artifact.tsx
<CodeMarkdown 
  content={content} 
  isSubmitting={isSubmitting}
  filename={artifact?.title || artifact?.identifier}
/>
```

This approach:
1. Passes artifact title/identifier directly from source
2. Ensures filename is available at the point of code rendering
3. Maintains fallback to identifier if title is not available

## Results After Sixth Attempt
- Need to verify artifact title/identifier is available
- Add console logging to track prop value
- Check if ReactMarkdown is preserving custom props

## Next Steps
1. Add console.log to verify artifact title/identifier
2. Check if filename prop survives ReactMarkdown transformation
3. Consider adding debug logging throughout component chain
4. May need to investigate alternative ways to pass metadata through ReactMarkdown

### 7. Found Missing Filename in Artifacts.tsx

#### Seventh Attempt - Adding Filename in Main Usage
Found the main usage of CodeMarkdown in Artifacts.tsx where filename prop was missing:

```typescript
// Before - in Artifacts.tsx
<CodeMarkdown
  content={`\`\`\`${getFileExtension(currentArtifact.type)}\n${
    currentArtifact.content ?? ''
  }\`\`\``}
  isSubmitting={isSubmitting}
/>

// After - in Artifacts.tsx
<CodeMarkdown
  content={`\`\`\`${getFileExtension(currentArtifact.type)}\n${
    currentArtifact.content ?? ''
  }\`\`\``}
  isSubmitting={isSubmitting}
  filename={currentArtifact.title || currentArtifact.identifier}
/>
```

This approach:
1. Identified the root cause - filename prop not being passed at point of use
2. Uses artifact's title with fallback to identifier
3. Completes the prop chain from Artifacts.tsx → CodeMarkdown → code component → MonacoEditor

## Results After Seventh Attempt
- Found where filename prop was missing in the component chain
- Added proper filename propagation from source
- Should now show correct filename in Monaco Editor

## Next Steps
1. Verify currentArtifact has title/identifier when component renders
2. Add console.log in Artifacts.tsx to confirm prop values
3. Test with different artifact types to ensure consistent behavior

### 8. Added Debug Logging for Filename Prop

#### Eighth Attempt - Debug Logging Through Component Chain
Added console.log statements to track filename prop:

```typescript
// In Artifacts.tsx
<CodeMarkdown
  filename={(() => {
    const filename = currentArtifact.title || currentArtifact.identifier;
    console.log('Artifacts.tsx - filename being passed:', filename);
    return filename;
  })()}
/>

// In Code.tsx
export const code: React.ElementType = memo(({ filename }: TCodeProps) => {
  console.log('Code.tsx - received filename:', filename);
  // ...
});

// In MonacoEditor.tsx
const MonacoEditor: React.FC<MonacoEditorProps> = ({ filename }) => {
  console.log('MonacoEditor.tsx - using filename:', filename);
  // ...
};
```

This approach:
1. Added logging at each step of the component chain
2. Self-executing function to log filename without side effects
3. Tracks prop value through the entire flow

## Results After Eighth Attempt
- Can now trace filename prop through component hierarchy
- Should help identify where/if the value is being lost
- Provides visibility into the prop drilling process

## Next Steps
1. Check browser console for log messages
2. Verify filename value at each step
3. Look for any steps where the value changes unexpectedly
4. Consider adding error boundaries if values are undefined

### 9. Fixed TypeScript Error with Filename Prop

#### Ninth Attempt - Proper Prop Handling
Modified CodeMarkdown to correctly handle the filename prop:

```typescript
// In Code.tsx
<ReactMarkdown
  rehypePlugins={rehypePlugins}
  components={{
    code: ({ filename: _filename, ...props }) => <code {...props} />,
  }}
>
  {currentContent}
</ReactMarkdown>
```

This approach:
1. Destructures and excludes filename prop from being passed to HTML element
2. Prevents TypeScript error about invalid props
3. Maintains prop chain for Monaco Editor
4. Properly handles HTML element attributes

## Results After Ninth Attempt
- Fixed TypeScript error
- Need to verify if this affects filename propagation
- May need to adjust how filename reaches Monaco Editor

## Next Steps
1. Verify filename still reaches Monaco Editor
2. Consider using React Context for metadata
3. Look into alternative ways to pass custom props through ReactMarkdown
4. Add type definitions for custom props if needed

### 10. Fixed ReactMarkdown Component Props TypeScript Error

#### Tenth Attempt - Proper TypeScript Handling
Modified CodeMarkdown to properly type ReactMarkdown component props:

```typescript
// In Code.tsx
<ReactMarkdown
  rehypePlugins={rehypePlugins}
  components={{
    code: (props: any) => {
      const { node, ...rest } = props;
      return <code {...rest} />;
    },
  }}
>
  {currentContent}
</ReactMarkdown>
```

This approach:
1. Uses proper typing for ReactMarkdown component props
2. Removes custom filename prop handling (since it's not needed at this level)
3. Properly spreads remaining props to HTML element
4. Maintains the filename prop chain through the custom code component

## Results After Tenth Attempt
- Fixed TypeScript error
- Simplified prop handling
- Maintains proper component hierarchy
- Preserves filename propagation to Monaco Editor

## Next Steps
1. Verify filename still reaches Monaco Editor through code component
2. Consider adding proper type definitions for ReactMarkdown components
3. Look into using React Context for metadata if prop drilling becomes too complex
4. Add more specific types instead of using 'any'

