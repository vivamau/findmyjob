import { render, screen } from '@testing-library/react';
import Button from '../Button';

describe('Button component', () => {
    it('renders with children text', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });
});
