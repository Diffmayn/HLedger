import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,transform,opacity] duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:brightness-110 shadow-card',
        secondary: 'bg-surface-2 text-ink hover:bg-surface border',
        ghost: 'text-ink-2 hover:bg-surface-2',
        danger: 'bg-danger text-white hover:brightness-110',
        glass: 'bg-black/45 text-white backdrop-blur-md hover:bg-black/60 border border-white/15',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-base',
        lg: 'h-14 px-7 text-lg',
        xl: 'h-16 px-8 text-xl',
        icon: 'h-11 w-11',
        'icon-lg': 'h-16 w-16',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(button({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
        {children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
